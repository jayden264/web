// 客户登录认证
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('clientLoginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleClientLogin);
    }
});

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

function handleClientLogin(e) {
    e.preventDefault();
    
    const phone = document.getElementById('clientPhone').value;
    const password = document.getElementById('clientPassword').value;
    
    // 从localStorage获取客户数据
    const clients = JSON.parse(localStorage.getItem('clients') || '[]');
    
    // 查找匹配的客户
    const client = clients.find(c => c.phone === phone && c.password === password);
    
    if (client) {
        // 登录成功，保存当前登录客户信息
        localStorage.setItem('currentClient', JSON.stringify(client));
        
        // 跳转到客户仪表盘
        window.location.href = 'client-dashboard.html';
    } else {
        showMessage('手机号码或密码错误，请重试', 'error');
    }
}

// 忘记密码功能 - 修改为更安全的方式
document.addEventListener('click', function(e) {
    if (e.target.id === 'forgotPassword') {
        e.preventDefault();
        const phone = prompt('请输入您的手机号码：');
        if (phone) {
            const clients = JSON.parse(localStorage.getItem('clients') || '[]');
            const client = clients.find(c => c.phone === phone);
            if (client) {
                // 创建密码重置请求
                const resetRequests = JSON.parse(localStorage.getItem('passwordResetRequests') || '[]');
                const existingRequest = resetRequests.find(r => r.phone === phone && r.status === 'pending');
                
                if (existingRequest) {
                    showMessage('您已提交过密码重置申请，请等待管理员处理', 'info');
                } else {
                    const resetRequest = {
                        id: Date.now(),
                        phone: phone,
                        clientName: client.name,
                        requestTime: new Date().toISOString(),
                        status: 'pending' // pending, approved, rejected
                    };
                    resetRequests.push(resetRequest);
                    localStorage.setItem('passwordResetRequests', JSON.stringify(resetRequests));
                    showMessage('密码重置申请已提交，管理员将在24小时内处理您的请求', 'success', '申请成功');
                }
            } else {
                showMessage('未找到该手机号码对应的账户', 'error');
            }
        }
    }
});