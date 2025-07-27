// 客户仪表盘功能
document.addEventListener('DOMContentLoaded', function() {
    // 检查登录状态
    const currentClient = JSON.parse(localStorage.getItem('currentClient'));
    if (!currentClient) {
        window.location.href = 'client-login.html';
        return;
    }
    
    // 显示客户信息
    displayClientInfo(currentClient);
    
    // 加载预约记录
    loadAppointments(currentClient.id);
    
    // 加载治疗记录
    loadTreatments(currentClient.id);
    
    // 预约表单处理
    const appointmentForm = document.getElementById('appointmentForm');
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', handleNewAppointment);
    }
});

function displayClientInfo(client) {
    document.getElementById('clientName').textContent = client.name;
    document.getElementById('displayName').textContent = client.name;
    document.getElementById('displayPhone').textContent = client.phone;
    document.getElementById('displayAge').textContent = client.age || '-';
    document.getElementById('displayRegDate').textContent = client.registrationDate || '-';
}

function loadAppointments(clientId) {
    const appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
    const clientAppointments = appointments.filter(apt => apt.clientId === clientId);
    
    const appointmentsList = document.getElementById('appointmentsList');
    
    if (clientAppointments.length === 0) {
        appointmentsList.innerHTML = '<p class="no-data">暂无预约记录</p>';
        return;
    }
    
    appointmentsList.innerHTML = clientAppointments.map(apt => `
        <div class="appointment-item ${apt.status}">
            <div class="appointment-date">
                <strong>${apt.date}</strong>
                <span>${apt.time}</span>
            </div>
            <div class="appointment-details">
                <p><strong>症状：</strong>${apt.symptoms || apt.notes || '-'}</p>
                <span class="status-badge status-${apt.status}">${getStatusText(apt.status)}</span>
            </div>
        </div>
    `).join('');
}

function loadTreatments(clientId) {
    const treatments = JSON.parse(localStorage.getItem('treatments') || '[]');
    const clientTreatments = treatments.filter(treatment => treatment.clientId === clientId);
    
    const treatmentsList = document.getElementById('treatmentsList');
    
    if (clientTreatments.length === 0) {
        treatmentsList.innerHTML = '<p class="no-data">暂无治疗记录</p>';
        return;
    }
    
    treatmentsList.innerHTML = clientTreatments.map(treatment => `
        <div class="treatment-item">
            <div class="treatment-header">
                <h4>${treatment.date}</h4>
                <span class="treatment-type">${treatment.type || '整骨治疗'}</span>
            </div>
            <div class="treatment-content">
                <p><strong>症状：</strong>${treatment.symptoms}</p>
                <p><strong>治疗方案：</strong>${treatment.treatment}</p>
                <p><strong>医师建议：</strong>${treatment.notes || '-'}</p>
            </div>
        </div>
    `).join('');
}

function showNewAppointment() {
    document.getElementById('appointmentModal').style.display = 'block';
    
    // 设置最小日期为今天
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('appointmentDate').min = today;
}

function closeAppointmentModal() {
    document.getElementById('appointmentModal').style.display = 'none';
    document.getElementById('appointmentForm').reset();
}

// 在文件开头添加消息提示函数
function showMessage(message, type = 'info', title = '') {
    // 移除已存在的消息框
    const existingOverlay = document.querySelector('.message-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    // 创建消息框
    const overlay = document.createElement('div');
    overlay.className = 'message-overlay';
    
    const iconMap = {
        'success': '✓',
        'error': '✕',
        'info': 'ℹ'
    };
    
    const titleMap = {
        'success': '成功',
        'error': '错误',
        'info': '提示'
    };
    
    overlay.innerHTML = `
        <div class="message-box">
            <span class="message-icon ${type}">${iconMap[type]}</span>
            <div class="message-title">${title || titleMap[type]}</div>
            <div class="message-content">${message}</div>
            <button class="message-btn ${type}" onclick="this.closest('.message-overlay').remove()">确定</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // 显示动画
    setTimeout(() => {
        overlay.classList.add('show');
    }, 10);
    
    // 3秒后自动关闭
    setTimeout(() => {
        if (overlay.parentNode) {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 300);
        }
    }, 3000);
}

function handleNewAppointment(e) {
    e.preventDefault();
    
    const currentClient = JSON.parse(localStorage.getItem('currentClient'));
    const date = document.getElementById('appointmentDate').value;
    const time = document.getElementById('appointmentTime').value;
    const symptoms = document.getElementById('appointmentSymptoms').value;
    
    // 检查时间冲突
    const appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
    const conflictAppointment = appointments.find(apt => 
        apt.date === date && 
        apt.time === time && 
        apt.status !== 'cancelled' && 
        apt.status !== 'completed'
    );
    
    if (conflictAppointment) {
        showMessage(
            `该时间段已被预约！\n预约客户：${conflictAppointment.customerName}\n请选择其他时间。`, 
            'error', 
            '时间冲突'
        );
        return;
    }
    
    const newAppointment = {
        id: Date.now(),
        clientId: currentClient.id,
        customerName: currentClient.name,
        clientPhone: currentClient.phone,
        date: date,
        time: time,
        symptoms: symptoms,
        service: symptoms || '整骨治疗',
        notes: symptoms,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    // 保存预约
    appointments.push(newAppointment);
    localStorage.setItem('appointments', JSON.stringify(appointments));
    
    // 关闭模态框并刷新预约列表
    closeAppointmentModal();
    loadAppointments(currentClient.id);
    
    showMessage('预约提交成功！我们会尽快联系您确认预约时间。', 'success');
}

function getStatusText(status) {
    const statusMap = {
        'pending': '待确认',
        'confirmed': '已确认',
        'completed': '已完成',
        'cancelled': '已取消'
    };
    return statusMap[status] || status;
}

function logout() {
    localStorage.removeItem('currentClient');
    window.location.href = 'client-login.html';
}

// 模态框点击外部关闭
window.onclick = function(event) {
    const modal = document.getElementById('appointmentModal');
    if (event.target === modal) {
        closeAppointmentModal();
    }
}

// 在客户端也需要更新预约时间选项
function loadAppointmentTimeOptions() {
    const timeGroups = JSON.parse(localStorage.getItem('timeGroups') || '[]');
    const timeSelect = document.getElementById('appointmentTime');
    
    if (!timeSelect) return;
    
    timeSelect.innerHTML = '<option value="">请选择时间</option>';
    
    // 获取选中的日期
    const selectedDate = document.getElementById('appointmentDate')?.value;
    
    timeGroups.forEach(group => {
        const timeValue = `${group.startTime}-${group.endTime}`;
        const option = document.createElement('option');
        option.value = timeValue;
        
        // 检查该时间段是否已被预约
        let isBooked = false;
        if (selectedDate) {
            const appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
            isBooked = appointments.some(apt => 
                apt.date === selectedDate && 
                apt.time === timeValue && 
                apt.status !== 'cancelled' && 
                apt.status !== 'completed'
            );
        }
        
        option.textContent = `${group.name} (${timeValue})${isBooked ? ' - 已预约' : ''}`;
        option.disabled = isBooked;
        
        timeSelect.appendChild(option);
    });
}

// 当日期改变时重新加载时间选项
document.addEventListener('DOMContentLoaded', function() {
    loadAppointmentTimeOptions();
    
    const dateInput = document.getElementById('appointmentDate');
    if (dateInput) {
        dateInput.addEventListener('change', loadAppointmentTimeOptions);
    }
});