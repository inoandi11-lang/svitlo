<?php
// Налаштування
$BOT_TOKEN = '8071462275:AAHjqCgsK6aAmfntsBwlo09z_Hcxq2mYk4M';
$WEBHOOK_URL = 'https://yourdomain.com/telegram-bot.php'; // Замініть на ваш домен
$OPENAI_API_KEY = 'your-openai-api-key'; // Додайте ваш OpenAI API ключ
$DATA_FILE = 'electrobalance_data.json';

// Функція для логування
function logMessage($message) {
    file_put_contents('bot.log', date('Y-m-d H:i:s') . ' - ' . $message . "\n", FILE_APPEND);
}

// Функція для відправки повідомлення в Telegram
function sendMessage($chat_id, $text, $reply_markup = null) {
    global $BOT_TOKEN;
    
    $data = [
        'chat_id' => $chat_id,
        'text' => $text,
        'parse_mode' => 'HTML'
    ];
    
    if ($reply_markup) {
        $data['reply_markup'] = json_encode($reply_markup);
    }
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.telegram.org/bot{$BOT_TOKEN}/sendMessage");
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $result = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($result, true);
}

// Функція для завантаження фото
function downloadPhoto($file_id) {
    global $BOT_TOKEN;
    
    // Отримуємо інформацію про файл
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.telegram.org/bot{$BOT_TOKEN}/getFile?file_id={$file_id}");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $result = curl_exec($ch);
    curl_close($ch);
    
    $file_info = json_decode($result, true);
    
    if (!$file_info['ok']) {
        return false;
    }
    
    $file_path = $file_info['result']['file_path'];
    
    // Завантажуємо файл
    $photo_url = "https://api.telegram.org/file/bot{$BOT_TOKEN}/{$file_path}";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $photo_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $photo_data = curl_exec($ch);
    curl_close($ch);
    
    return $photo_data;
}

// Функція для розпізнавання показників за допомогою ChatGPT Vision
function recognizeMeterReading($photo_data, $meter_type) {
    global $OPENAI_API_KEY;
    
    // Конвертуємо фото в base64
    $base64_image = base64_encode($photo_data);
    
    $prompt = "Розпізнай показник лічильника електроенергії на фото. Це {$meter_type} лічильник. Поверни ТІЛЬКИ число без пробілів, крапок чи інших символів. Наприклад: 12345";
    
    $data = [
        'model' => 'gpt-4o',
        'messages' => [
            [
                'role' => 'user',
                'content' => [
                    [
                        'type' => 'text',
                        'text' => $prompt
                    ],
                    [
                        'type' => 'image_url',
                        'image_url' => [
                            'url' => "data:image/jpeg;base64,{$base64_image}"
                        ]
                    ]
                ]
            ]
        ],
        'max_tokens' => 50,
        'temperature' => 0.1
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://api.openai.com/v1/chat/completions');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $OPENAI_API_KEY
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $result = curl_exec($ch);
    curl_close($ch);
    
    $response = json_decode($result, true);
    
    if (isset($response['choices'][0]['message']['content'])) {
        $reading = trim($response['choices'][0]['message']['content']);
        // Перевіряємо, чи це число
        if (is_numeric($reading)) {
            return intval($reading);
        }
    }
    
    return false;
}

// Функція для завантаження даних
function loadData() {
    global $DATA_FILE;
    
    if (!file_exists($DATA_FILE)) {
        return [
            'settings' => [
                'price_per_kwh' => 8,
                'monthly_payment' => 2000
            ],
            'records' => []
        ];
    }
    
    $data = file_get_contents($DATA_FILE);
    return json_decode($data, true);
}

// Функція для збереження даних
function saveData($data) {
    global $DATA_FILE;
    file_put_contents($DATA_FILE, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// Функція для додавання запису
function addRecord($vt, $nt, $date = null) {
    if (!$date) {
        $date = date('Y-m-d');
    }
    
    $data = loadData();
    
    $record = [
        'date' => $date,
        'vt' => $vt,
        'nt' => $nt
    ];
    
    $data['records'][] = $record;
    saveData($data);
    
    return true;
}

// Обробка webhook
$input = file_get_contents('php://input');
$update = json_decode($input, true);

logMessage('Received update: ' . $input);

if (!$update) {
    http_response_code(400);
    exit('Invalid JSON');
}

$message = $update['message'] ?? null;
if (!$message) {
    http_response_code(200);
    exit('No message');
}

$chat_id = $message['chat']['id'];
$text = $message['text'] ?? '';
$photos = $message['photo'] ?? [];

// Стани користувачів
$user_states_file = 'user_states.json';
$user_states = [];

if (file_exists($user_states_file)) {
    $user_states = json_decode(file_get_contents($user_states_file), true);
}

$user_id = $message['from']['id'];
$user_state = $user_states[$user_id] ?? 'idle';

// Обробка команд
if ($text === '/start') {
    $user_states[$user_id] = 'idle';
    file_put_contents($user_states_file, json_encode($user_states));
    
    sendMessage($chat_id, "🔌 <b>ЕлектроБаланс Бот</b>\n\n"
        . "Я допоможу вам додати показники лічильника електроенергії.\n\n"
        . "Для початку натисніть /add щоб додати новий запис.");
    
} elseif ($text === '/add') {
    $user_states[$user_id] = 'waiting_vt_photo';
    file_put_contents($user_states_file, json_encode($user_states));
    
    $keyboard = [
        'inline_keyboard' => [
            [
                ['text' => '❌ Скасувати', 'callback_data' => 'cancel']
            ]
        ]
    ];
    
    sendMessage($chat_id, "📸 <b>Додавання показника</b>\n\n"
        . "1️⃣ Спочатку надішліть фото <b>VT лічильника</b> (денний тариф)", $keyboard);
    
} elseif ($text === '/cancel') {
    $user_states[$user_id] = 'idle';
    file_put_contents($user_states_file, json_encode($user_states));
    
    sendMessage($chat_id, "❌ Операцію скасовано.");
    
} elseif ($user_state === 'waiting_vt_photo' && !empty($photos)) {
    // Завантажуємо та розпізнаємо VT фото
    $photo = end($photos); // Беремо найбільший розмір
    $photo_data = downloadPhoto($photo['file_id']);
    
    if ($photo_data) {
        $vt_reading = recognizeMeterReading($photo_data, 'VT (денний тариф)');
        
        if ($vt_reading !== false) {
            $user_states[$user_id] = 'waiting_nt_photo';
            $user_states[$user_id . '_vt'] = $vt_reading;
            file_put_contents($user_states_file, json_encode($user_states));
            
            sendMessage($chat_id, "✅ VT лічильник розпізнано: <b>{$vt_reading}</b>\n\n"
                . "2️⃣ Тепер надішліть фото <b>NT лічильника</b> (нічний тариф)");
        } else {
            sendMessage($chat_id, "❌ Не вдалося розпізнати показник VT лічильника.\n\n"
                . "Будь ласка, спробуйте ще раз з більш чітким фото.");
        }
    } else {
        sendMessage($chat_id, "❌ Помилка завантаження фото. Спробуйте ще раз.");
    }
    
} elseif ($user_state === 'waiting_nt_photo' && !empty($photos)) {
    // Завантажуємо та розпізнаємо NT фото
    $photo = end($photos);
    $photo_data = downloadPhoto($photo['file_id']);
    
    if ($photo_data) {
        $nt_reading = recognizeMeterReading($photo_data, 'NT (нічний тариф)');
        
        if ($nt_reading !== false) {
            $vt_reading = $user_states[$user_id . '_vt'];
            
            // Додаємо запис
            $date = date('Y-m-d');
            addRecord($vt_reading, $nt_reading, $date);
            
            // Очищуємо стан користувача
            unset($user_states[$user_id]);
            unset($user_states[$user_id . '_vt']);
            file_put_contents($user_states_file, json_encode($user_states));
            
            $total_consumption = $vt_reading + $nt_reading;
            
            sendMessage($chat_id, "✅ <b>Запис додано успішно!</b>\n\n"
                . "📅 Дата: {$date}\n"
                . "☀️ VT (денний): {$vt_reading}\n"
                . "🌙 NT (нічний): {$nt_reading}\n"
                . "📊 Загальний показник: {$total_consumption}\n\n"
                . "Використайте /add для додавання нового запису.");
        } else {
            sendMessage($chat_id, "❌ Не вдалося розпізнати показник NT лічильника.\n\n"
                . "Будь ласка, спробуйте ще раз з більш чітким фото.");
        }
    } else {
        sendMessage($chat_id, "❌ Помилка завантаження фото. Спробуйте ще раз.");
    }
    
} elseif (!empty($photos)) {
    // Якщо користувач надіслав фото не в правильному стані
    sendMessage($chat_id, "❌ Будь ласка, спочіть на команду /add щоб додати показники лічильника.");
    
} else {
    // Невідома команда
    sendMessage($chat_id, "❓ Невідома команда. Використайте /start для початку роботи.");
}

// Обробка callback queries
$callback_query = $update['callback_query'] ?? null;
if ($callback_query) {
    $callback_data = $callback_query['data'];
    $callback_chat_id = $callback_query['message']['chat']['id'];
    
    if ($callback_data === 'cancel') {
        $user_states[$user_id] = 'idle';
        file_put_contents($user_states_file, json_encode($user_states));
        
        // Відповідаємо на callback
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "https://api.telegram.org/bot{$BOT_TOKEN}/answerCallbackQuery");
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, [
            'callback_query_id' => $callback_query['id'],
            'text' => 'Операцію скасовано'
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_exec($ch);
        curl_close($ch);
        
        sendMessage($callback_chat_id, "❌ Операцію скасовано.");
    }
}

http_response_code(200);
echo 'OK';
?>
