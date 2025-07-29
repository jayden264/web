// 移动端导航菜单切换
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// 点击导航链接后关闭移动端菜单
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// 平滑滚动
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// 导航栏滚动效果
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        navbar.style.backdropFilter = 'blur(10px)';
    } else {
        navbar.style.background = '#fff';
        navbar.style.backdropFilter = 'none';
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

// 表单提交处理
const contactForm = document.querySelector('.contact-form form');
contactForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // 获取表单数据
    const formData = new FormData(this);
    const name = this.querySelector('input[type="text"]').value;
    const phone = this.querySelector('input[type="tel"]').value;
    const message = this.querySelector('textarea').value;
    
    // 简单验证
    if (!name || !phone) {
        showMessage('请填写姓名和联系电话', 'error');
        return;
    }
    
    // 这里可以添加实际的表单提交逻辑
    showMessage('预约信息已提交，我们会尽快联系您！', 'success');
    this.reset();
});

// 服务卡片动画
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// 观察服务卡片
document.querySelectorAll('.service-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
});