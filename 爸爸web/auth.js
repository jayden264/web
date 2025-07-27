// 简化的认证系统
document.addEventListener('DOMContentLoaded', function() {
    // 用户凭据
    const users = {
        'shawn': 'shawn0102031235',
        
    };

    // 检查是否已登录
    if (localStorage.getItem('isLoggedIn') === 'true') {
        window.location.href = 'admin.html';
        return;
    }

    // 绑定登录表单
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            
            console.log('尝试登录:', username); // 调试信息
            
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
            
            // 验证凭据
            if (users[username] && users[username] === password) {
                // 登录成功
                // 登录成功后设置
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('username', username);
                localStorage.setItem('loginTime', new Date().toISOString());
                
                showMessage('登录成功！正在跳转...', 'success');
                setTimeout(() => {
                    window.location.href = 'admin.html';
                }, 1500);
            } else {
                showMessage('用户名或密码错误！', 'error');
            }
        });
    } else {
        console.error('找不到登录表单');
    }
});

// 退出登录函数
function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    localStorage.removeItem('loginTime');
    window.location.href = 'login.html';
}