<?php
// Скрипт для налаштування webhook для Telegram бота

$BOT_TOKEN = '8071462275:AAHjqCgsK6aAmfntsBwlo09z_Hcxq2mYk4M';
$WEBHOOK_URL = 'https://yourdomain.com/telegram-bot.php'; // ЗАМІНІТЬ НА ВАШ ДОМЕН!

echo "Налаштування webhook для Telegram бота...\n";

// Встановлюємо webhook
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.telegram.org/bot{$BOT_TOKEN}/setWebhook");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, [
    'url' => $WEBHOOK_URL
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$result = curl_exec($ch);
curl_close($ch);

$response = json_decode($result, true);

if ($response['ok']) {
    echo "✅ Webhook успішно встановлено!\n";
    echo "URL: {$WEBHOOK_URL}\n";
} else {
    echo "❌ Помилка встановлення webhook:\n";
    echo $response['description'] . "\n";
}

// Перевіряємо інформацію про webhook
echo "\nПеревірка інформації про webhook...\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.telegram.org/bot{$BOT_TOKEN}/getWebhookInfo");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$result = curl_exec($ch);
curl_close($ch);

$webhook_info = json_decode($result, true);

if ($webhook_info['ok']) {
    $info = $webhook_info['result'];
    echo "URL: " . ($info['url'] ?? 'Не встановлено') . "\n";
    echo "Has custom certificate: " . ($info['has_custom_certificate'] ? 'Так' : 'Ні') . "\n";
    echo "Pending update count: " . ($info['pending_update_count'] ?? 0) . "\n";
    
    if (isset($info['last_error_message'])) {
        echo "Остання помилка: " . $info['last_error_message'] . "\n";
    }
}

echo "\nГотово! Тепер бот готовий до роботи.\n";
echo "ВАЖЛИВО: Не забудьте замінити 'your-openai-api-key' на ваш реальний API ключ OpenAI!\n";
?>
