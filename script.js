// Глобальні змінні
let appData = {
    settings: {
        price_per_kwh: 8,
        monthly_payment: 2000
    },
    records: []
};

// Ініціалізація додатку
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    setupEventListeners();
    updateMainScreen();
    updateHistoryScreen();
    updateSettingsForm();
    
    // Додаємо обробник форми редагування внеску
    document.getElementById('edit-payment-form').addEventListener('submit', savePayment);
});

// Завантаження даних з localStorage
function loadData() {
    const saved = localStorage.getItem('electrobalance_data');
    if (saved) {
        appData = JSON.parse(saved);
    } else {
        // Початкові дані з ТЗ (показники лічильника)
        appData.records = [
            {
                date: "2025-07-15",
                vt: 1759,
                nt: 46889
            },
            {
                date: "2025-08-20", 
                vt: 1782,
                nt: 47018
            },
            {
                date: "2025-09-24",
                vt: 1813,
                nt: 47159
            },
            {
                date: "2025-10-01",
                vt: 1821,
                nt: 47203
            }
        ];
        saveData();
    }
}

// Функція для очищення даних (для тестування)
function clearData() {
    localStorage.removeItem('electrobalance_data');
    location.reload();
}

// Функція для завантаження тестових даних
function loadSampleData() {
    const sampleData = {
        "settings": {
            "price_per_kwh": 8,
            "monthly_payment": 2000
        },
        "records": [
            {
                "date": "2024-01-01",
                "vt": 1000,
                "nt": 5000
            },
            {
                "date": "2024-01-15",
                "vt": 1050,
                "nt": 5150
            },
            {
                "date": "2024-02-01",
                "vt": 1100,
                "nt": 5300
            },
            {
                "date": "2024-02-15",
                "vt": 1150,
                "nt": 5450
            },
            {
                "date": "2024-03-01",
                "vt": 1200,
                "nt": 5600
            },
            {
                "date": "2024-03-15",
                "vt": 1250,
                "nt": 5750
            }
        ]
    };
    
    appData = sampleData;
    saveData();
    updateMainScreen();
    updateHistoryScreen();
    alert('Реалістичні тестові дані завантажено!');
}

// Збереження даних у localStorage
function saveData() {
    localStorage.setItem('electrobalance_data', JSON.stringify(appData));
}

// Налаштування обробників подій
function setupEventListeners() {
    // Форма додавання запису
    const addForm = document.getElementById('add-record-form');
    addForm.addEventListener('submit', handleAddRecord);

    // Поля вводу для попереднього перегляду
    const inputs = ['vt-reading', 'nt-reading', 'total-reading'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', updatePreview);
    });

    // Встановлення сьогоднішньої дати
    document.getElementById('record-date').valueAsDate = new Date();
}

// Навігація між екранами
function showScreen(screenId) {
    // Приховуємо всі екрани
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    // Показуємо потрібний екран
    document.getElementById(screenId).classList.add('active');

    // Оновлюємо активну кнопку навігації
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Встановлюємо активну кнопку
    const navButtons = {
        'main-screen': 0,
        'history-screen': 1,
        'add-record-screen': 2,
        'settings-screen': 3
    };
    
    if (navButtons[screenId] !== undefined) {
        document.querySelectorAll('.nav-btn')[navButtons[screenId]].classList.add('active');
    }

    // Оновлюємо дані на екрані
    if (screenId === 'main-screen') {
        updateMainScreen();
    } else if (screenId === 'history-screen') {
        updateHistoryScreen();
    } else if (screenId === 'settings-screen') {
        updateSettingsForm();
    }
}

// Розрахунок споживання між записами
function calculateConsumption(currentRecord, previousRecord) {
    let currentTotal = 0;
    let previousTotal = 0;

    if (currentRecord.vt && currentRecord.nt) {
        currentTotal = currentRecord.vt + currentRecord.nt;
    } else if (currentRecord.total) {
        currentTotal = currentRecord.total;
    }

    if (previousRecord) {
        if (previousRecord.vt && previousRecord.nt) {
            previousTotal = previousRecord.vt + previousRecord.nt;
        } else if (previousRecord.total) {
            previousTotal = previousRecord.total;
        }
    }

    if (!previousRecord) {
        // Для першого запису розраховуємо середнє споживання на основі наступних записів
        const sortedRecords = [...appData.records].sort((a, b) => new Date(a.date) - new Date(b.date));
        if (sortedRecords.length > 1) {
            const nextRecord = sortedRecords[1];
            let nextTotal = 0;
            
            if (nextRecord.vt && nextRecord.nt) {
                nextTotal = nextRecord.vt + nextRecord.nt;
            } else if (nextRecord.total) {
                nextTotal = nextRecord.total;
            }
            
            const daysDiff = Math.ceil((new Date(nextRecord.date) - new Date(currentRecord.date)) / (1000 * 60 * 60 * 24));
            const avgConsumption = (nextTotal - currentTotal) / daysDiff;
            const daysInMonth = 30; // Приблизна кількість днів у місяці
            
            return Math.max(0, avgConsumption * daysInMonth);
        }
        return 0;
    }

    return Math.max(0, currentTotal - previousTotal);
}

// Розрахунок вартості
function calculateCost(kwh) {
    return kwh * appData.settings.price_per_kwh;
}

// Отримання даних по місяцях
function getMonthlyData() {
    const monthlyData = {};
    
    // Сортуємо записи за датою
    const sortedRecords = [...appData.records].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    for (let i = 0; i < sortedRecords.length; i++) {
        const record = sortedRecords[i];
        const date = new Date(record.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                month: monthKey,
                records: [],
                totalConsumption: 0,
                cost: 0,
                balance: 0
            };
        }
        
        monthlyData[monthKey].records.push(record);
        
        // Розраховуємо споживання
        const previousRecord = i > 0 ? sortedRecords[i - 1] : null;
        const consumption = calculateConsumption(record, previousRecord);
        monthlyData[monthKey].totalConsumption += consumption;
        monthlyData[monthKey].cost += calculateCost(consumption);
    }
    
    // Розраховуємо баланс для кожного місяця
    Object.values(monthlyData).forEach(month => {
        const customPayment = month.customPayment || appData.settings.monthly_payment;
        month.balance = customPayment - month.cost;
    });
    
    return monthlyData;
}

// Оновлення головного екрану
function updateMainScreen() {
    const monthlyData = getMonthlyDataWithCustomPayments();
    const months = Object.values(monthlyData);
    
    // Загальне споживання
    const totalConsumption = months.reduce((sum, month) => sum + month.totalConsumption, 0);
    
    // Розраховуємо загальну кількість днів між першим та останнім записом
    const sortedRecords = [...appData.records].sort((a, b) => new Date(a.date) - new Date(b.date));
    let totalDays = 0;
    
    if (sortedRecords.length > 1) {
        const firstDate = new Date(sortedRecords[0].date);
        const lastDate = new Date(sortedRecords[sortedRecords.length - 1].date);
        totalDays = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1;
    } else if (sortedRecords.length === 1) {
        totalDays = 1;
    }
    
    const avgConsumptionPerDay = totalDays > 0 ? (totalConsumption / totalDays).toFixed(2) : 0;
    
    // Останній місяць
    const lastMonth = months[months.length - 1];
    let lastMonthAvg = 0;
    
    if (lastMonth && lastMonth.records.length > 1) {
        const firstRecord = lastMonth.records[0];
        const lastRecord = lastMonth.records[lastMonth.records.length - 1];
        const monthDays = Math.ceil((new Date(lastRecord.date) - new Date(firstRecord.date)) / (1000 * 60 * 60 * 24)) + 1;
        lastMonthAvg = (lastMonth.totalConsumption / monthDays).toFixed(2);
    } else if (lastMonth && lastMonth.records.length === 1) {
        lastMonthAvg = lastMonth.totalConsumption.toFixed(2);
    }
    
    // Поточний місяць
    const currentDate = new Date();
    const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const currentMonth = monthlyData[currentMonthKey];
    const currentMonthBalance = currentMonth ? currentMonth.balance : appData.settings.monthly_payment;
    const currentMonthCost = currentMonth ? currentMonth.cost : 0;
    
    // Загальний баланс
    const totalBalance = months.reduce((sum, month) => sum + month.balance, 0);
    
    // Оновлюємо DOM
    document.getElementById('avg-consumption').textContent = `${avgConsumptionPerDay} кВт/день`;
    document.getElementById('last-month-consumption').textContent = `${lastMonthAvg} кВт/день`;
    document.getElementById('month-balance').textContent = `${currentMonthBalance.toFixed(0)} Kč`;
    document.getElementById('month-cost').textContent = `${currentMonthCost.toFixed(0)} Kč`;
    document.getElementById('total-balance').textContent = `${totalBalance.toFixed(0)} Kč`;
    
    // Колір балансу
    const balanceElement = document.getElementById('month-balance');
    const balanceSubtitle = document.getElementById('month-balance-subtitle');
    
    if (currentMonthBalance > 0) {
        balanceElement.className = 'stat-value balance-positive';
        balanceSubtitle.textContent = 'Поточний місяць (плюс)';
    } else if (currentMonthBalance < 0) {
        balanceElement.className = 'stat-value balance-negative';
        balanceSubtitle.textContent = 'Поточний місяць (мінус)';
    } else {
        balanceElement.className = 'stat-value balance-zero';
        balanceSubtitle.textContent = 'Поточний місяць (рівно)';
    }
    
    // Оновлюємо графік
    updateChart(months);
}

// Оновлення екрану історії
function updateHistoryScreen() {
    const monthlyData = getMonthlyDataWithCustomPayments();
    const tbody = document.getElementById('history-tbody');
    tbody.innerHTML = '';
    
    const months = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
    
    months.forEach(month => {
        const row = document.createElement('tr');
        
        // Форматуємо дату як MM.YYYY
        const [year, monthNum] = month.month.split('-');
        const monthDisplay = `${monthNum}.${year}`;
        
        const balanceClass = month.balance > 0 ? 'balance-positive' : 
                           month.balance < 0 ? 'balance-negative' : 'balance-zero';
        
        const balanceIcon = month.balance > 0 ? 'fas fa-plus-circle' : 
                          month.balance < 0 ? 'fas fa-minus-circle' : 'fas fa-circle';
        
        // Перевіряємо, чи це перший місяць (для показу приблизного розрахунку)
        const isFirstMonth = month.month === Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month))[0].month;
        const consumptionText = isFirstMonth && month.totalConsumption > 0 ? 
            `${month.totalConsumption.toFixed(0)} кВт ~` : 
            `${month.totalConsumption.toFixed(0)} кВт`;
        
        const customPayment = month.customPayment || appData.settings.monthly_payment;
        const paymentText = month.customPayment ? 
            `${customPayment.toFixed(0)} Kč <i class="fas fa-edit" style="font-size: 10px; color: #666;"></i>` : 
            `${customPayment.toFixed(0)} Kč`;
        
        row.innerHTML = `
            <td>${monthDisplay}</td>
            <td>${consumptionText}</td>
            <td>${month.cost.toFixed(0)} Kč</td>
            <td onclick="event.stopPropagation(); editPayment('${month.month}', ${customPayment})" style="cursor: pointer; position: relative;">
                ${paymentText}
            </td>
            <td class="${balanceClass}">
                <i class="${balanceIcon} balance-icon"></i>
                ${month.balance.toFixed(0)} Kč
            </td>
        `;
        
        // Додаємо обробник кліку для показу деталей місяця
        row.addEventListener('click', () => showMonthDetails(month));
        
        tbody.appendChild(row);
    });
}

// Оновлення форми налаштувань
function updateSettingsForm() {
    document.getElementById('price-per-kwh').value = appData.settings.price_per_kwh;
    document.getElementById('monthly-payment').value = appData.settings.monthly_payment;
}

// Збереження налаштувань
function saveSettings() {
    appData.settings.price_per_kwh = parseFloat(document.getElementById('price-per-kwh').value);
    appData.settings.monthly_payment = parseFloat(document.getElementById('monthly-payment').value);
    
    saveData();
    updateMainScreen();
    updateHistoryScreen();
    
    // Показуємо повідомлення про успіх
    alert('Налаштування збережено!');
}

// Обробка додавання запису
function handleAddRecord(event) {
    event.preventDefault();
    
    const date = document.getElementById('record-date').value;
    const vt = parseFloat(document.getElementById('vt-reading').value) || null;
    const nt = parseFloat(document.getElementById('nt-reading').value) || null;
    const total = parseFloat(document.getElementById('total-reading').value) || null;
    
    if (!vt && !nt && !total) {
        alert('Будь ласка, введіть принаймні один показник');
        return;
    }
    
    const newRecord = {
        date: date,
        vt: vt,
        nt: nt,
        total: total
    };
    
    appData.records.push(newRecord);
    saveData();
    
    // Очищуємо форму
    document.getElementById('add-record-form').reset();
    document.getElementById('record-date').valueAsDate = new Date();
    document.getElementById('preview-section').style.display = 'none';
    
    // Оновлюємо екрани
    updateMainScreen();
    updateHistoryScreen();
    
    // Повертаємося на головний екран
    showScreen('main-screen');
    
    alert('Запис додано успішно!');
}

// Оновлення попереднього перегляду
function updatePreview() {
    const vt = parseFloat(document.getElementById('vt-reading').value) || 0;
    const nt = parseFloat(document.getElementById('nt-reading').value) || 0;
    const total = parseFloat(document.getElementById('total-reading').value) || 0;
    
    let consumption = 0;
    
    if (total > 0) {
        consumption = total;
    } else if (vt > 0 || nt > 0) {
        consumption = vt + nt;
    }
    
    // Знаходимо попередній запис для розрахунку різниці
    const sortedRecords = [...appData.records].sort((a, b) => new Date(a.date) - new Date(b.date));
    const lastRecord = sortedRecords[sortedRecords.length - 1];
    
    if (lastRecord) {
        let lastTotal = 0;
        if (lastRecord.vt && lastRecord.nt) {
            lastTotal = lastRecord.vt + lastRecord.nt;
        } else if (lastRecord.total) {
            lastTotal = lastRecord.total;
        }
        
        consumption = Math.max(0, consumption - lastTotal);
    }
    
    const cost = calculateCost(consumption);
    
    document.getElementById('preview-consumption').textContent = `${consumption.toFixed(0)} кВт`;
    document.getElementById('preview-cost').textContent = `${cost.toFixed(0)} Kč`;
    
    const previewSection = document.getElementById('preview-section');
    if (consumption > 0) {
        previewSection.style.display = 'block';
    } else {
        previewSection.style.display = 'none';
    }
}

// Простий графік споживання
function updateChart(months) {
    const canvas = document.getElementById('consumption-chart');
    const ctx = canvas.getContext('2d');
    
    // Очищуємо canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (months.length === 0) return;
    
    const maxConsumption = Math.max(...months.map(m => m.totalConsumption));
    const barWidth = canvas.width / months.length * 0.8;
    const barSpacing = canvas.width / months.length * 0.2;
    
    months.forEach((month, index) => {
        const barHeight = (month.totalConsumption / maxConsumption) * (canvas.height - 80);
        const x = index * (barWidth + barSpacing) + barSpacing / 2;
        const y = canvas.height - barHeight - 60;
        
        // Колір залежно від балансу
        const color = month.balance > 0 ? '#10b981' : '#ef4444';
        
        ctx.fillStyle = color;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Підпис місяця (формат MM.YYYY)
        ctx.fillStyle = '#333';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        const [year, monthNum] = month.month.split('-');
        const monthDisplay = `${monthNum}.${year}`;
        ctx.fillText(monthDisplay, x + barWidth / 2, canvas.height - 5);
        
        // Показуємо кіловати на стовпці
        ctx.fillStyle = '#333';
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        const kwhText = `${month.totalConsumption.toFixed(0)} кВт`;
        ctx.fillText(kwhText, x + barWidth / 2, y - 5);
        
        // Показуємо вартість під стовпцем
        ctx.fillStyle = '#666';
        ctx.font = '8px Arial';
        const costText = `${month.cost.toFixed(0)} Kč`;
        ctx.fillText(costText, x + barWidth / 2, y + barHeight + 15);
    });
}

// Експорт даних
function exportData() {
    const dataStr = JSON.stringify(appData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `electrobalance_data_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

// Імпорт даних
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Валідація даних
            if (importedData.settings && importedData.records) {
                appData = importedData;
                saveData();
                updateMainScreen();
                updateHistoryScreen();
                updateSettingsForm();
                alert('Дані успішно імпортовано!');
            } else {
                alert('Невірний формат файлу!');
            }
        } catch (error) {
            alert('Помилка при читанні файлу: ' + error.message);
        }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Очищуємо input
}

// Показ деталей місяця
function showMonthDetails(month) {
    const modal = document.getElementById('month-details-modal');
    const title = document.getElementById('modal-month-title');
    const stats = document.getElementById('modal-month-stats');
    const recordsList = document.getElementById('modal-records-list');
    
    // Отримуємо дані з індивідуальними внесками
    const monthlyData = getMonthlyDataWithCustomPayments();
    const monthWithCustomPayment = monthlyData[month.month] || month;
    
    // Форматуємо назву місяця
    const [year, monthNum] = month.month.split('-');
    const monthName = new Date(month.month + '-01').toLocaleDateString('uk-UA', { 
        month: 'long', 
        year: 'numeric' 
    });
    
    title.textContent = `${monthName} (${monthNum}.${year})`;
    
    // Статистика місяця
    const balanceClass = monthWithCustomPayment.balance > 0 ? 'balance-positive' : 
                        monthWithCustomPayment.balance < 0 ? 'balance-negative' : 'balance-zero';
    
    const customPayment = monthWithCustomPayment.customPayment || appData.settings.monthly_payment;
    const paymentNote = monthWithCustomPayment.paymentNote ? 
        ` <small style="color: #666;">(${monthWithCustomPayment.paymentNote})</small>` : '';
    
    stats.innerHTML = `
        <div class="month-stat-item">
            <div class="month-stat-value">${monthWithCustomPayment.totalConsumption.toFixed(0)} кВт</div>
            <div class="month-stat-label">Спожито</div>
        </div>
        <div class="month-stat-item">
            <div class="month-stat-value">${monthWithCustomPayment.cost.toFixed(0)} Kč</div>
            <div class="month-stat-label">Вартість</div>
        </div>
        <div class="month-stat-item">
            <div class="month-stat-value">${customPayment.toFixed(0)} Kč${paymentNote}</div>
            <div class="month-stat-label">Внесок</div>
        </div>
        <div class="month-stat-item">
            <div class="month-stat-value ${balanceClass}">${monthWithCustomPayment.balance.toFixed(0)} Kč</div>
            <div class="month-stat-label">Баланс</div>
        </div>
    `;
    
    // Список записів
    recordsList.innerHTML = '';
    
    if (month.records.length === 0) {
        recordsList.innerHTML = '<p style="text-align: center; color: #666; margin: 20px 0;">Немає записів за цей місяць</p>';
    } else {
        month.records.forEach((record, index) => {
            const recordItem = document.createElement('div');
            recordItem.className = 'record-item';
            
            const date = new Date(record.date).toLocaleDateString('uk-UA');
            const vtText = record.vt ? `VT: ${record.vt}` : '';
            const ntText = record.nt ? `NT: ${record.nt}` : '';
            const totalText = record.total ? `Загальний: ${record.total}` : '';
            
            const values = [vtText, ntText, totalText].filter(Boolean).join(' | ');
            
            recordItem.innerHTML = `
                <div class="record-info">
                    <div class="record-date">${date}</div>
                    <div class="record-values">${values}</div>
                </div>
                <div class="record-actions">
                    <button class="btn-delete" onclick="deleteRecord('${month.month}', ${index})">
                        <i class="fas fa-trash"></i>
                        Видалити
                    </button>
                </div>
            `;
            
            recordsList.appendChild(recordItem);
        });
    }
    
    modal.classList.add('active');
}

// Закриття модального вікна
function closeMonthModal() {
    const modal = document.getElementById('month-details-modal');
    modal.classList.remove('active');
}

// Видалення запису
function deleteRecord(monthKey, recordIndex) {
    if (!confirm('Ви впевнені, що хочете видалити цей запис?')) {
        return;
    }
    
    // Знаходимо запис в загальному масиві
    const monthlyData = getMonthlyDataWithCustomPayments();
    const month = monthlyData[monthKey];
    
    if (month && month.records[recordIndex]) {
        const recordToDelete = month.records[recordIndex];
        
        // Видаляємо запис з загального масиву
        const recordIndexInGlobal = appData.records.findIndex(record => 
            record.date === recordToDelete.date &&
            record.vt === recordToDelete.vt &&
            record.nt === recordToDelete.nt &&
            record.total === recordToDelete.total
        );
        
        if (recordIndexInGlobal !== -1) {
            appData.records.splice(recordIndexInGlobal, 1);
            saveData();
            
            // Оновлюємо екрани
            updateMainScreen();
            updateHistoryScreen();
            
            // Оновлюємо модальне вікно
            showMonthDetails(month);
            
            alert('Запис видалено успішно!');
        }
    }
}

// Закриття модального вікна при кліку поза ним
document.addEventListener('click', function(event) {
    const modal = document.getElementById('month-details-modal');
    if (event.target === modal) {
        closeMonthModal();
    }
});

// Закриття модального вікна клавішею Escape
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeMonthModal();
        closeEditPaymentModal();
    }
});

// Редагування внеску для місяця
function editPayment(monthKey, currentAmount) {
    const modal = document.getElementById('edit-payment-modal');
    const title = document.getElementById('edit-payment-title');
    const amountInput = document.getElementById('edit-payment-amount');
    
    // Форматуємо назву місяця
    const [year, monthNum] = monthKey.split('-');
    const monthName = new Date(monthKey + '-01').toLocaleDateString('uk-UA', { 
        month: 'long', 
        year: 'numeric' 
    });
    
    title.textContent = `Редагування внеску - ${monthName}`;
    amountInput.value = currentAmount;
    
    // Зберігаємо поточний місяць для збереження
    modal.dataset.monthKey = monthKey;
    
    modal.classList.add('active');
}

// Закриття модального вікна редагування внеску
function closeEditPaymentModal() {
    const modal = document.getElementById('edit-payment-modal');
    modal.classList.remove('active');
    document.getElementById('edit-payment-form').reset();
}

// Збереження внеску
function savePayment(event) {
    event.preventDefault();
    
    const modal = document.getElementById('edit-payment-modal');
    const monthKey = modal.dataset.monthKey;
    const amount = parseFloat(document.getElementById('edit-payment-amount').value);
    const note = document.getElementById('edit-payment-note').value;
    
    if (!monthKey || isNaN(amount)) {
        alert('Помилка: некоректні дані');
        return;
    }
    
    // Зберігаємо індивідуальний внесок для місяця
    if (!appData.customPayments) {
        appData.customPayments = {};
    }
    
    appData.customPayments[monthKey] = {
        amount: amount,
        note: note || null,
        updatedAt: new Date().toISOString()
    };
    
    saveData();
    
    // Оновлюємо екрани
    updateMainScreen();
    updateHistoryScreen();
    
    closeEditPaymentModal();
    alert('Внесок збережено успішно!');
}

// Оновлюємо функцію getMonthlyData для врахування індивідуальних внесків
function getMonthlyDataWithCustomPayments() {
    const monthlyData = getMonthlyData();
    
    // Додаємо індивідуальні внески
    if (appData.customPayments) {
        Object.keys(appData.customPayments).forEach(monthKey => {
            if (monthlyData[monthKey]) {
                monthlyData[monthKey].customPayment = appData.customPayments[monthKey].amount;
                monthlyData[monthKey].paymentNote = appData.customPayments[monthKey].note;
            }
        });
    }
    
    return monthlyData;
}

