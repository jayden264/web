class AdminSystem {
    constructor() {
        this.customers = JSON.parse(localStorage.getItem('customers') || '[]');
        this.appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
        this.records = JSON.parse(localStorage.getItem('records') || '[]');
        this.timeGroups = JSON.parse(localStorage.getItem('timeGroups') || '[]');
        this.currentSection = 'dashboard';
        
        this.migrateAppointmentData();
        
        this.waitForDOM().then(() => {
            this.init();
        });
    }

    async waitForDOM() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    init() {
        try {
            this.checkAuth();
            this.setupEventListeners();
            this.loadDashboard();
            this.loadSampleData();
            this.initTimeGroupsManagement();
            this.updateCurrentTime();
            setInterval(() => this.updateCurrentTime(), 1000);
        } catch (error) {
            console.error('初始化失败:', error);
            setTimeout(() => this.init(), 1000);
        }
    }

    checkAuth() {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (!isLoggedIn || isLoggedIn !== 'true') {
            window.location.href = 'login.html';
            return;
        }
    }

    setupEventListeners() {
        // 导航链接
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.getAttribute('data-section');
                this.showSection(section);
            });
        });

        // 退出登录
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('username');
                localStorage.removeItem('loginTime');
                window.location.href = 'login.html';
            });
        }

        // 添加按钮
        const addCustomerBtn = document.getElementById('addCustomerBtn');
        if (addCustomerBtn) {
            addCustomerBtn.addEventListener('click', () => this.showAddCustomerModal());
        }

        const addAppointmentBtn = document.getElementById('addAppointmentBtn');
        if (addAppointmentBtn) {
            addAppointmentBtn.addEventListener('click', () => this.showAddAppointmentModal());
        }

        const addRecordBtn = document.getElementById('addRecordBtn');
        if (addRecordBtn) {
            addRecordBtn.addEventListener('click', () => this.showAddRecordModal());
        }

        // 搜索功能
        const customerSearch = document.getElementById('customerSearch');
        if (customerSearch) {
            customerSearch.addEventListener('input', (e) => {
                this.searchCustomers(e.target.value);
            });
        }

        const recordSearch = document.getElementById('recordSearch');
        if (recordSearch) {
            recordSearch.addEventListener('input', (e) => {
                this.searchRecords(e.target.value);
            });
        }

        // 筛选功能
        const dateFilter = document.getElementById('dateFilter');
        const statusFilter = document.getElementById('statusFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', () => this.filterAppointments());
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterAppointments());
        }

        // 预约时间设置表单
        const appointmentTimeForm = document.getElementById('appointmentTimeForm');
        if (appointmentTimeForm) {
            appointmentTimeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveAppointmentTimeSettings();
            });
        }

        // 模态框关闭
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal();
            }
            if (e.target.classList.contains('close')) {
                this.closeModal();
            }
        });
    }

    updateCurrentTime() {
        const timeElement = document.getElementById('currentTime');
        if (timeElement) {
            const now = new Date();
            timeElement.textContent = now.toLocaleString('zh-CN');
        }
    }

    showSection(sectionName) {
        // 隐藏所有部分
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // 显示选中的部分
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionName;
        }

        // 更新页面标题
        const pageTitle = document.getElementById('pageTitle');
        const titleMap = {
            'dashboard': '仪表盘',
            'customers': '客户管理',
            'appointments': '预约管理',
            'records': '治疗记录',
            'settings': '系统设置'
        };
        if (pageTitle && titleMap[sectionName]) {
            pageTitle.textContent = titleMap[sectionName];
        }

        // 更新导航状态
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // 加载对应数据
        switch(sectionName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'customers':
                this.loadCustomers();
                break;
            case 'appointments':
                this.loadAppointments();
                break;
            case 'records':
                this.loadRecords();
                break;
            case 'settings':
                this.loadAppointmentTimeSettings();
                this.loadPasswordResetRequests();
                this.loadTimeGroups();
                break;
        }
    }

    loadDashboard() {
        // 统计数据
        const totalCustomers = this.customers.length;
        const todayAppointments = this.appointments.filter(apt => 
            apt.date === new Date().toISOString().split('T')[0]
        ).length;
        const totalRecords = this.records.length;
        const monthlyRevenue = this.records
            .filter(record => {
                const recordDate = new Date(record.date);
                const now = new Date();
                return recordDate.getMonth() === now.getMonth() && 
                       recordDate.getFullYear() === now.getFullYear();
            })
            .reduce((sum, record) => sum + (record.fee || 0), 0);

        // 更新统计显示
        const totalCustomersEl = document.getElementById('totalCustomers');
        const todayAppointmentsEl = document.getElementById('todayAppointments');
        const totalRecordsEl = document.getElementById('totalRecords');
        const monthlyRevenueEl = document.getElementById('monthlyRevenue');

        if (totalCustomersEl) totalCustomersEl.textContent = totalCustomers;
        if (todayAppointmentsEl) todayAppointmentsEl.textContent = todayAppointments;
        if (totalRecordsEl) totalRecordsEl.textContent = totalRecords;
        if (monthlyRevenueEl) monthlyRevenueEl.textContent = `RM ${monthlyRevenue.toFixed(2)}`;

        this.loadRecentActivities();
    }

    loadRecentActivities() {
        const recentActivities = [
            ...this.records.slice(-3).map(record => ({
                type: 'record',
                text: `${record.customerName} - ${record.treatment}`,
                time: this.getRelativeTime(record.date)
            })),
            ...this.appointments.slice(-2).map(apt => ({
                type: 'appointment',
                text: `${apt.customerName} - ${apt.service}`,
                time: this.getRelativeTime(apt.date)
            }))
        ].sort((a, b) => new Date(b.time) - new Date(a.time));

        const activitiesList = document.getElementById('recentActivities');
        if (activitiesList) {
            activitiesList.innerHTML = recentActivities.map(activity => `
                <div class="activity-item">
                    <span class="activity-icon">${activity.type === 'record' ? '📋' : '📅'}</span>
                    <span class="activity-text">${activity.text}</span>
                    <span class="activity-time">${activity.time}</span>
                </div>
            `).join('');
        }
    }

    getRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return '1天前';
        if (diffDays < 7) return `${diffDays}天前`;
        if (diffDays < 30) return `${Math.ceil(diffDays / 7)}周前`;
        return `${Math.ceil(diffDays / 30)}月前`;
    }

    loadCustomers() {
        const tbody = document.querySelector('#customersTable tbody');
        if (!tbody) return;
        
        tbody.innerHTML = this.customers.map(customer => {
            const hasAccount = this.checkIfCustomerHasAccount(customer.phone);
            return `
                <tr>
                    <td>${customer.name}</td>
                    <td>${customer.phone}</td>
                    <td>${customer.age}</td>
                    <td>${customer.registrationDate}</td>
                    <td>${customer.lastVisit || '未就诊'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="adminSystem.editCustomer('${customer.id}')">编辑</button>
                        ${hasAccount ? 
                            '<span class="account-status">✅ 已有账号</span>' : 
                            `<button class="btn btn-sm btn-success" onclick="adminSystem.createCustomerAccount('${customer.id}')">创建账号</button>`
                        }
                        <button class="btn btn-sm btn-danger" onclick="adminSystem.deleteCustomer('${customer.id}')">删除</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    loadAppointments() {
        const tbody = document.querySelector('#appointmentsTable tbody');
        if (!tbody) return;
        
        tbody.innerHTML = this.appointments.map(apt => `
            <tr>
                <td>${apt.customerName}</td>
                <td>${apt.date} ${apt.time}</td>
                <td>${apt.service}</td>
                <td><span class="status-badge status-${apt.status}">${this.getStatusText(apt.status)}</span></td>
                <td>${apt.notes || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="adminSystem.updateAppointmentStatus('${apt.id}', 'confirmed')" ${apt.status === 'confirmed' || apt.status === 'completed' ? 'disabled' : ''}>确认</button>
                    <button class="btn btn-sm btn-warning" onclick="adminSystem.updateAppointmentStatus('${apt.id}', 'completed')" ${apt.status === 'completed' ? 'disabled' : ''}>完成</button>
                    <button class="btn btn-sm btn-danger" onclick="adminSystem.deleteAppointment('${apt.id}')">删除</button>
                </td>
            </tr>
        `).join('');
    }

    loadRecords() {
        const tbody = document.querySelector('#recordsTable tbody');
        if (!tbody) return;
        
        tbody.innerHTML = this.records.map(record => `
            <tr>
                <td>${record.customerName}</td>
                <td>${record.date}</td>
                <td>${record.treatment}</td>
                <td>${record.symptoms}</td>
                <td>${record.plan}</td>
                <td>RM ${record.fee}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="adminSystem.editRecord('${record.id}')">编辑</button>
                    <button class="btn btn-sm btn-danger" onclick="adminSystem.deleteRecord('${record.id}')">删除</button>
                </td>
            </tr>
        `).join('');
    }

    getStatusText(status) {
        const statusMap = {
            'pending': '待确认',
            'confirmed': '已确认',
            'completed': '已完成',
            'cancelled': '已取消'
        };
        return statusMap[status] || status;
    }

    showModal(title, content) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        
        if (modal && modalBody) {
            modalBody.innerHTML = `
                <div class="modal-header">
                    <h3>${title}</h3>
                </div>
                <div class="modal-content-body">
                    ${content}
                </div>
            `;
            modal.style.display = 'flex';
        }
    }

    closeModal() {
        const modal = document.getElementById('modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showConfirmModal(title, content, onConfirm, confirmText = '确认', cancelText = '取消') {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        
        if (modal && modalBody) {
            modalBody.innerHTML = `
                <div class="confirm-modal">
                    <h3>${title}</h3>
                    ${content}
                    <div class="confirm-actions">
                        <button class="btn btn-primary" id="confirmBtn">${confirmText}</button>
                        <button class="btn btn-secondary" id="cancelBtn">${cancelText}</button>
                    </div>
                </div>
            `;
            modal.style.display = 'flex';
            
            // 确保事件监听器正确绑定
            const confirmBtn = document.getElementById('confirmBtn');
            const cancelBtn = document.getElementById('cancelBtn');
            
            if (confirmBtn) {
                confirmBtn.onclick = () => {
                    try {
                        onConfirm();
                        this.closeModal();
                    } catch (error) {
                        console.error('确认操作失败:', error);
                        this.showMessage('操作失败，请重试', 'error');
                    }
                };
            }
            
            if (cancelBtn) {
                cancelBtn.onclick = () => {
                    this.closeModal();
                };
            }
        }
    }

    editCustomer(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) {
            this.showMessage('客户不存在', 'error');
            return;
        }

        const content = `
            <form id="editCustomerForm">
                <div class="form-group">
                    <label>客户姓名</label>
                    <input type="text" id="editCustomerName" value="${customer.name}" required>
                </div>
                <div class="form-group">
                    <label>联系电话</label>
                    <input type="tel" id="editCustomerPhone" value="${customer.phone}" required>
                </div>
                <div class="form-group">
                    <label>年龄</label>
                    <input type="number" id="editCustomerAge" value="${customer.age}" required>
                </div>
                <div class="form-group">
                    <label>地址</label>
                    <textarea id="editCustomerAddress">${customer.address || ''}</textarea>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">💾 保存修改</button>
                    <button type="button" class="btn btn-secondary" onclick="adminSystem.closeModal()">❌ 取消</button>
                </div>
            </form>
        `;
        
        this.showModal('✏️ 编辑客户信息', content);
        
        document.getElementById('editCustomerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateCustomer(customerId);
        });
    }

    updateCustomer(customerId) {
        const customerIndex = this.customers.findIndex(c => c.id === customerId);
        if (customerIndex === -1) {
            this.showMessage('客户不存在', 'error');
            return;
        }

        this.customers[customerIndex] = {
            ...this.customers[customerIndex],
            name: document.getElementById('editCustomerName').value,
            phone: document.getElementById('editCustomerPhone').value,
            age: document.getElementById('editCustomerAge').value,
            address: document.getElementById('editCustomerAddress').value
        };
        
        this.saveData();
        this.loadCustomers();
        this.closeModal();
        this.showMessage('客户信息更新成功！', 'success');
    }

    deleteCustomer(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) {
            this.showMessage('客户不存在', 'error');
            return;
        }

        this.showConfirmModal(
            '🗑️ 删除客户确认',
            `<div class="confirm-content">
                <p><strong>确定要删除客户 "${customer.name}" 吗？</strong></p>
                <div class="warning-box">
                    <p>⚠️ <strong>警告：此操作将同时删除：</strong></p>
                    <ul>
                        <li>该客户的所有预约记录</li>
                        <li>该客户的所有治疗记录</li>
                        <li>此操作无法恢复！</li>
                    </ul>
                </div>
            </div>`,
            () => {
                this.customers = this.customers.filter(c => c.id !== customerId);
                this.appointments = this.appointments.filter(apt => apt.customerName !== customer.name);
                this.records = this.records.filter(record => record.customerName !== customer.name);
                
                this.saveData();
                this.loadCustomers();
                this.loadDashboard();
                this.showMessage('客户及相关数据已删除', 'success');
            }
        );
    }

    editRecord(recordId) {
        const record = this.records.find(r => r.id === recordId);
        if (!record) {
            this.showMessage('治疗记录不存在', 'error');
            return;
        }

        const content = `
            <form id="editRecordForm">
                <div class="form-group">
                    <label>客户姓名</label>
                    <input type="text" id="editRecordCustomer" value="${record.customerName}" required>
                </div>
                <div class="form-group">
                    <label>治疗日期</label>
                    <input type="date" id="editRecordDate" value="${record.date}" required>
                </div>
                <div class="form-group">
                    <label>治疗项目</label>
                    <input type="text" id="editRecordTreatment" value="${record.treatment}" required>
                </div>
                <div class="form-group">
                    <label>症状描述</label>
                    <textarea id="editRecordSymptoms">${record.symptoms}</textarea>
                </div>
                <div class="form-group">
                    <label>治疗方案</label>
                    <textarea id="editRecordPlan">${record.plan}</textarea>
                </div>
                <div class="form-group">
                    <label>费用 (RM)</label>
                    <input type="number" id="editRecordFee" value="${record.fee}" step="0.01" required>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">💾 保存修改</button>
                    <button type="button" class="btn btn-secondary" onclick="adminSystem.closeModal()">❌ 取消</button>
                </div>
            </form>
        `;
        
        this.showModal('✏️ 编辑治疗记录', content);
        
        document.getElementById('editRecordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateRecord(recordId);
        });
    }

    updateRecord(recordId) {
        const recordIndex = this.records.findIndex(r => r.id === recordId);
        if (recordIndex === -1) {
            this.showMessage('治疗记录不存在', 'error');
            return;
        }

        this.records[recordIndex] = {
            ...this.records[recordIndex],
            customerName: document.getElementById('editRecordCustomer').value,
            date: document.getElementById('editRecordDate').value,
            treatment: document.getElementById('editRecordTreatment').value,
            symptoms: document.getElementById('editRecordSymptoms').value,
            plan: document.getElementById('editRecordPlan').value,
            fee: parseFloat(document.getElementById('editRecordFee').value)
        };
        
        this.saveData();
        this.loadRecords();
        this.closeModal();
        this.showMessage('治疗记录更新成功！', 'success');
    }

    deleteRecord(recordId) {
        const record = this.records.find(r => r.id === recordId);
        if (!record) {
            this.showMessage('治疗记录不存在', 'error');
            return;
        }

        this.showConfirmModal(
            '🗑️ 删除治疗记录确认',
            `<div class="confirm-content">
                <p><strong>确定要删除 "${record.customerName}" 的治疗记录吗？</strong></p>
                <div class="warning-box">
                    <p><strong>治疗项目：</strong>${record.treatment}</p>
                    <p><strong>治疗日期：</strong>${record.date}</p>
                    <p>⚠️ <strong>此操作无法恢复！</strong></p>
                </div>
            </div>`,
            () => {
                this.records = this.records.filter(r => r.id !== recordId);
                this.saveData();
                this.loadRecords();
                this.loadDashboard();
                this.showMessage('治疗记录已删除', 'success');
            }
        );
    }

    showAddCustomerModal() {
        const content = `
            <div class="modern-form">
                <form id="addCustomerForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="icon">👤</i> 客户姓名</label>
                            <input type="text" id="customerName" placeholder="请输入客户姓名" required>
                        </div>
                        <div class="form-group">
                            <label><i class="icon">📞</i> 联系电话</label>
                            <input type="tel" id="customerPhone" placeholder="+60xx-xxx-xxxx" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="icon">🎂</i> 年龄</label>
                            <input type="number" id="customerAge" placeholder="年龄" min="1" max="120" required>
                        </div>
                        <div class="form-group">
                            <label><i class="icon">📅</i> 注册日期</label>
                            <input type="date" id="customerRegDate" value="${new Date().toISOString().split('T')[0]}" readonly>
                        </div>
                    </div>
                    <div class="form-group full-width">
                        <label><i class="icon">🏠</i> 详细地址</label>
                        <textarea id="customerAddress" placeholder="请输入详细地址（可选）" rows="3"></textarea>
                    </div>
                    <div class="form-group full-width">
                        <label><i class="icon">📝</i> 备注信息</label>
                        <textarea id="customerNotes" placeholder="其他备注信息（可选）" rows="2"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary btn-large">
                            <i class="icon">✨</i> 添加客户
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="adminSystem.closeModal()">
                            <i class="icon">❌</i> 取消
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        this.showModal('🆕 添加新客户', content);
        
        document.getElementById('addCustomerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addCustomer();
        });
    }

    addCustomer() {
        const customer = {
            id: Date.now().toString(),
            name: document.getElementById('customerName').value,
            phone: document.getElementById('customerPhone').value,
            age: document.getElementById('customerAge').value,
            address: document.getElementById('customerAddress').value,
            registrationDate: new Date().toLocaleDateString('zh-CN'),
            lastVisit: null
        };
        
        this.customers.push(customer);
        this.saveData();
        this.loadCustomers();
        this.closeModal();
        this.showMessage('客户添加成功！', 'success');
    }

    showAddRecordModal() {
        const customerOptions = this.customers.map(customer => 
            `<option value="${customer.name}">${customer.name} (${customer.phone})</option>`
        ).join('');
        
        const content = `
            <div class="modern-form">
                <form id="addRecordForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="icon">👤</i> 选择客户</label>
                            <select id="recordCustomer" required>
                                <option value="">请选择客户</option>
                                ${customerOptions}
                                <option value="new">+ 新客户</option>
                            </select>
                        </div>
                        <div class="form-group" id="newRecordCustomerName" style="display: none;">
                            <label><i class="icon">✏️</i> 新客户姓名</label>
                            <input type="text" id="newRecordCustomerInput" placeholder="请输入客户姓名">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="icon">📅</i> 治疗日期</label>
                            <input type="date" id="recordDate" value="${new Date().toISOString().split('T')[0]}" required>
                        </div>
                        <div class="form-group">
                            <label><i class="icon">🏥</i> 治疗项目</label>
                            <select id="recordTreatment" required>
                                <option value="">请选择治疗项目</option>
                                <option value="脊椎矫正">脊椎矫正</option>
                                <option value="颈椎治疗">颈椎治疗</option>
                                <option value="腰椎治疗">腰椎治疗</option>
                                <option value="关节调整">关节调整</option>
                                <option value="软组织治疗">软组织治疗</option>
                                <option value="康复训练">康复训练</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group full-width">
                        <label><i class="icon">📋</i> 症状描述</label>
                        <textarea id="recordSymptoms" placeholder="请描述客户的症状和主诉" rows="3" required></textarea>
                    </div>
                    <div class="form-group full-width">
                        <label><i class="icon">💡</i> 治疗方案</label>
                        <textarea id="recordPlan" placeholder="请描述治疗方案和建议" rows="3" required></textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="icon">💰</i> 治疗费用 (RM)</label>
                            <input type="number" id="recordFee" placeholder="0.00" step="0.01" min="0" required>
                        </div>
                        <div class="form-group">
                            <label><i class="icon">📝</i> 下次复诊</label>
                            <input type="date" id="nextVisit" min="${new Date().toISOString().split('T')[0]}">
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary btn-large">
                            <i class="icon">💾</i> 保存治疗记录
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="adminSystem.closeModal()">
                            <i class="icon">❌</i> 取消
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        this.showModal('📋 添加治疗记录', content);
        
        document.getElementById('recordCustomer').addEventListener('change', function() {
            const newCustomerDiv = document.getElementById('newRecordCustomerName');
            if (this.value === 'new') {
                newCustomerDiv.style.display = 'block';
                document.getElementById('newRecordCustomerInput').required = true;
            } else {
                newCustomerDiv.style.display = 'none';
                document.getElementById('newRecordCustomerInput').required = false;
            }
        });
        
        document.getElementById('addRecordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addRecord();
        });
    }

    addRecord() {
        const customerSelect = document.getElementById('recordCustomer');
        let customerName = customerSelect.value;
        
        if (customerName === 'new') {
            customerName = document.getElementById('newRecordCustomerInput').value;
            if (!customerName) {
                this.showMessage('请输入新客户姓名', 'error');
                return;
            }
        }
        
        const record = {
            id: Date.now().toString(),
            customerName: customerName,
            date: document.getElementById('recordDate').value,
            treatment: document.getElementById('recordTreatment').value,
            symptoms: document.getElementById('recordSymptoms').value,
            plan: document.getElementById('recordPlan').value,
            fee: parseFloat(document.getElementById('recordFee').value) || 0,
            nextVisit: document.getElementById('nextVisit').value || null,
            createdAt: new Date().toISOString()
        };
        
        this.records.push(record);
        
        const customer = this.customers.find(c => c.name === record.customerName);
        if (customer) {
            customer.lastVisit = record.date;
        }
        
        this.saveData();
        this.loadRecords();
        this.loadDashboard();
        this.closeModal();
        this.showMessage('治疗记录添加成功！', 'success');
        
        if (record.nextVisit) {
            setTimeout(() => {
                this.showConfirmModal(
                    '📅 创建复诊预约',
                    `<div class="confirm-content">
                        <p>已设置下次复诊时间：<strong>${record.nextVisit}</strong></p>
                        <p>是否立即为患者创建预约？</p>
                    </div>`,
                    () => {
                        this.createFollowUpAppointment(record);
                    }
                );
            }, 1000);
        }
    }

    showAddAppointmentModal() {
        const customerOptions = this.customers.map(customer => 
            `<option value="${customer.name}">${customer.name} (${customer.phone})</option>`
        ).join('');
        
        const content = `
            <div class="modern-form">
                <form id="addAppointmentForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="icon">👤</i> 选择客户</label>
                            <select id="appointmentCustomer" required>
                                <option value="">请选择客户</option>
                                ${customerOptions}
                                <option value="new">+ 新客户</option>
                            </select>
                        </div>
                        <div class="form-group" id="newCustomerName" style="display: none;">
                            <label><i class="icon">✏️</i> 新客户姓名</label>
                            <input type="text" id="newCustomerNameInput" placeholder="请输入客户姓名">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="icon">📅</i> 预约日期</label>
                            <input type="date" id="appointmentDate" min="${new Date().toISOString().split('T')[0]}" required>
                        </div>
                        <div class="form-group">
                            <label><i class="icon">🕐</i> 预约时间</label>
                            <select id="appointmentTime" required>
                                <option value="">请选择时间</option>
                                <option value="09:00">09:00</option>
                                <option value="10:00">10:00</option>
                                <option value="11:00">11:00</option>
                                <option value="14:00">14:00</option>
                                <option value="15:00">15:00</option>
                                <option value="16:00">16:00</option>
                                <option value="17:00">17:00</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group full-width">
                        <label><i class="icon">🏥</i> 服务项目</label>
                        <select id="appointmentService" required>
                            <option value="">请选择服务</option>
                            <option value="脊椎矫正">脊椎矫正</option>
                            <option value="颈椎治疗">颈椎治疗</option>
                            <option value="腰椎治疗">腰椎治疗</option>
                            <option value="关节调整">关节调整</option>
                            <option value="软组织治疗">软组织治疗</option>
                            <option value="康复训练">康复训练</option>
                        </select>
                    </div>
                    <div class="form-group full-width">
                        <label><i class="icon">📝</i> 备注信息</label>
                        <textarea id="appointmentNotes" placeholder="症状描述或特殊要求（可选）" rows="3"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary btn-large">
                            <i class="icon">📅</i> 创建预约
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="adminSystem.closeModal()">
                            <i class="icon">❌</i> 取消
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        this.showModal('📅 新建预约', content);
        
        document.getElementById('appointmentCustomer').addEventListener('change', function() {
            const newCustomerDiv = document.getElementById('newCustomerName');
            if (this.value === 'new') {
                newCustomerDiv.style.display = 'block';
                document.getElementById('newCustomerNameInput').required = true;
            } else {
                newCustomerDiv.style.display = 'none';
                document.getElementById('newCustomerNameInput').required = false;
            }
        });
        
        document.getElementById('addAppointmentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addAppointment();
        });
    }

    addAppointment() {
        const customerSelect = document.getElementById('appointmentCustomer');
        let customerName = customerSelect.value;
        
        if (customerName === 'new') {
            customerName = document.getElementById('newCustomerNameInput').value;
            if (!customerName) {
                this.showMessage('请输入新客户姓名', 'error');
                return;
            }
        }
        
        const appointment = {
            id: Date.now().toString(),
            customerName: customerName,
            date: document.getElementById('appointmentDate').value,
            time: document.getElementById('appointmentTime').value,
            service: document.getElementById('appointmentService').value,
            status: 'pending',
            notes: document.getElementById('appointmentNotes').value,
            createdAt: new Date().toISOString()
        };
        
        this.appointments.push(appointment);
        this.saveData();
        this.loadAppointments();
        this.loadDashboard();
        this.closeModal();
        this.showMessage('预约创建成功！', 'success');
    }

    updateAppointmentStatus(appointmentId, newStatus) {
        // 确保ID类型匹配
        const appointmentIndex = this.appointments.findIndex(apt => 
            apt.id == appointmentId || apt.id === parseInt(appointmentId) || apt.id === appointmentId.toString()
        );
        
        if (appointmentIndex === -1) {
            this.showMessage('预约不存在', 'error');
            return;
        }

        const appointment = this.appointments[appointmentIndex];
        const oldStatus = appointment.status;
        
        this.appointments[appointmentIndex].status = newStatus;
        this.saveData();
        this.loadAppointments();
        this.loadDashboard();
        
        const statusText = this.getStatusText(newStatus);
        this.showMessage(`预约状态已更新为：${statusText}`, 'success');
        
        if (newStatus === 'completed' && oldStatus !== 'completed') {
            setTimeout(() => {
                // 直接创建治疗记录，不使用确认模态框
                this.createTreatmentRecord(appointment);
            }, 500);
        }
    }

    deleteAppointment(appointmentId) {
        // 确保ID类型匹配 - 支持数字和字符串类型的ID
        const appointment = this.appointments.find(apt => 
            apt.id == appointmentId || apt.id === parseInt(appointmentId) || apt.id === appointmentId.toString()
        );
        
        if (!appointment) {
            this.showMessage('预约不存在', 'error');
            return;
        }

        this.showConfirmModal(
            '🗑️ 删除预约确认',
            `<div class="confirm-content">
                <p><strong>确定要删除 "${appointment.customerName}" 的预约吗？</strong></p>
                <div class="warning-box">
                    <p><strong>预约时间：</strong>${appointment.date} ${appointment.time}</p>
                    <p><strong>服务项目：</strong>${appointment.service}</p>
                    <p>⚠️ <strong>此操作无法恢复！</strong></p>
                </div>
            </div>`,
            () => {
                // 同样确保删除时的ID匹配
                this.appointments = this.appointments.filter(apt => 
                    apt.id != appointmentId && apt.id !== parseInt(appointmentId) && apt.id !== appointmentId.toString()
                );
                this.saveData();
                this.loadAppointments();
                this.loadDashboard();
                this.showMessage('预约已删除', 'success');
            }
        );
    }

    createTreatmentRecord(appointment) {
        const content = `
            <div class="modern-form">
                <form id="createRecordForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="icon">👤</i> 客户姓名</label>
                            <input type="text" id="recordCustomerName" value="${appointment.customerName}" readonly>
                        </div>
                        <div class="form-group">
                            <label><i class="icon">📅</i> 治疗日期</label>
                            <input type="date" id="recordDate" value="${appointment.date}" required>
                        </div>
                    </div>
                    <div class="form-group full-width">
                        <label><i class="icon">🏥</i> 治疗项目</label>
                        <input type="text" id="recordTreatment" value="${appointment.service}" required>
                    </div>
                    <div class="form-group full-width">
                        <label><i class="icon">📋</i> 症状描述</label>
                        <textarea id="recordSymptoms" placeholder="请描述客户的症状和主诉" rows="3" required></textarea>
                    </div>
                    <div class="form-group full-width">
                        <label><i class="icon">💡</i> 治疗方案</label>
                        <textarea id="recordPlan" placeholder="请描述治疗方案和建议" rows="3" required></textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="icon">💰</i> 治疗费用 (RM)</label>
                            <input type="number" id="recordFee" placeholder="0.00" step="0.01" min="0" required>
                        </div>
                        <div class="form-group">
                            <label><i class="icon">📝</i> 下次复诊</label>
                            <input type="date" id="nextVisit" min="${new Date().toISOString().split('T')[0]}">
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary btn-large">
                            <i class="icon">💾</i> 保存治疗记录
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="adminSystem.closeModal()">
                            <i class="icon">❌</i> 取消
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        this.showModal('📋 创建治疗记录', content);
        
        document.getElementById('createRecordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTreatmentRecord();
        });
    }

    saveTreatmentRecord() {
        const record = {
            id: Date.now().toString(),
            customerName: document.getElementById('recordCustomerName').value,
            date: document.getElementById('recordDate').value,
            treatment: document.getElementById('recordTreatment').value,
            symptoms: document.getElementById('recordSymptoms').value,
            plan: document.getElementById('recordPlan').value,
            fee: parseFloat(document.getElementById('recordFee').value) || 0,
            nextVisit: document.getElementById('nextVisit').value || null,
            createdAt: new Date().toISOString()
        };
        
        this.records.push(record);
        
        const customer = this.customers.find(c => c.name === record.customerName);
        if (customer) {
            customer.lastVisit = record.date;
        }
        
        this.saveData();
        this.closeModal();
        this.showMessage('治疗记录已保存！', 'success');
        
        if (record.nextVisit) {
            setTimeout(() => {
                this.showConfirmModal(
                    '📅 创建复诊预约',
                    `<div class="confirm-content">
                        <p>已设置下次复诊时间：<strong>${record.nextVisit}</strong></p>
                        <p>是否立即为患者创建预约？</p>
                    </div>`,
                    () => {
                        this.createFollowUpAppointment(record);
                    }
                );
            }, 1000);
        }
    }

    createFollowUpAppointment(record) {
        const appointment = {
            id: Date.now().toString(),
            customerName: record.customerName,
            date: record.nextVisit,
            time: '09:00',
            service: record.treatment,
            status: 'pending',
            notes: '复诊预约',
            createdAt: new Date().toISOString()
        };
        
        this.appointments.push(appointment);
        this.saveData();
        this.showMessage('复诊预约已创建！', 'success');
    }

    filterAppointments() {
        const dateFilter = document.getElementById('dateFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        
        let filteredAppointments = [...this.appointments];
        
        if (dateFilter) {
            filteredAppointments = filteredAppointments.filter(apt => apt.date === dateFilter);
        }
        
        if (statusFilter) {
            filteredAppointments = filteredAppointments.filter(apt => apt.status === statusFilter);
        }
        
        const tbody = document.querySelector('#appointmentsTable tbody');
        tbody.innerHTML = filteredAppointments.map(apt => `
            <tr>
                <td>${apt.customerName}</td>
                <td>${apt.date} ${apt.time}</td>
                <td>${apt.service}</td>
                <td><span class="status-badge status-${apt.status}">${this.getStatusText(apt.status)}</span></td>
                <td>${apt.notes || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="adminSystem.updateAppointmentStatus('${apt.id}', 'confirmed')" ${apt.status === 'confirmed' || apt.status === 'completed' ? 'disabled' : ''}>确认</button>
                    <button class="btn btn-sm btn-warning" onclick="adminSystem.updateAppointmentStatus('${apt.id}', 'completed')" ${apt.status === 'completed' ? 'disabled' : ''}>完成</button>
                    <button class="btn btn-sm btn-danger" onclick="adminSystem.deleteAppointment('${apt.id}')">删除</button>
                </td>
            </tr>
        `).join('');
    }

    saveData() {
        localStorage.setItem('customers', JSON.stringify(this.customers));
        localStorage.setItem('appointments', JSON.stringify(this.appointments));
        localStorage.setItem('records', JSON.stringify(this.records));
    }

    loadSampleData() {
        // 检查是否是首次使用（没有任何数据且没有设置过初始化标记）
        const isFirstTime = localStorage.getItem('systemInitialized') !== 'true';
        
        if (isFirstTime && this.customers.length === 0 && this.appointments.length === 0 && this.records.length === 0) {
            this.customers = [
                {
                    id: '1',
                    name: '张先生',
                    phone: '+6012-345-6789',
                    age: 45,
                    address: 'Kuching, Sarawak',
                    registrationDate: '2024-01-15',
                    lastVisit: '2024-01-20'
                },
                {
                    id: '2',
                    name: '李女士',
                    phone: '+6013-456-7890',
                    age: 38,
                    address: 'Kuching, Sarawak',
                    registrationDate: '2024-01-18',
                    lastVisit: '2024-01-25'
                }
            ];
            
            this.appointments = [
                {
                    id: '1',
                    customerName: '王先生',
                    date: new Date().toISOString().split('T')[0],
                    time: '10:00',
                    service: '脊椎矫正',
                    status: 'confirmed',
                    notes: '腰部疼痛'
                }
            ];
            
            this.records = [
                {
                    id: '1',
                    customerName: '张先生',
                    date: '2024-01-20',
                    treatment: '脊椎矫正',
                    symptoms: '腰部疼痛，活动受限',
                    plan: '手法矫正，建议休息',
                    fee: 150
                }
            ];
            
            this.saveData();
            localStorage.setItem('systemInitialized', 'true');
        }
    }

    showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            ${type === 'success' ? 'background: #28a745;' : 'background: #dc3545;'}
        `;

        document.body.appendChild(messageDiv);
        setTimeout(() => messageDiv.remove(), 3000);
    }

    checkIfCustomerHasAccount(phone) {
        const clients = JSON.parse(localStorage.getItem('clients') || '[]');
        return clients.some(client => client.phone === phone);
    }

    createCustomerAccount(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) {
            this.showMessage('客户不存在', 'error');
            return;
        }

        // 检查是否已有账号
        if (this.checkIfCustomerHasAccount(customer.phone)) {
            this.showMessage('该客户已有账号', 'warning');
            return;
        }

        const content = `
            <div class="modern-form">
                <form id="createAccountForm">
                    <div class="form-group">
                        <label><i class="icon">👤</i> 客户姓名</label>
                        <input type="text" value="${customer.name}" readonly>
                    </div>
                    <div class="form-group">
                        <label><i class="icon">📱</i> 手机号码（登录账号）</label>
                        <input type="text" value="${customer.phone}" readonly>
                    </div>
                    <div class="form-group">
                        <label><i class="icon">🔒</i> 设置密码</label>
                        <input type="password" id="accountPassword" placeholder="请设置6-20位密码" required minlength="6" maxlength="20">
                    </div>
                    <div class="form-group">
                        <label><i class="icon">🔒</i> 确认密码</label>
                        <input type="password" id="confirmPassword" placeholder="请再次输入密码" required>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">✅ 创建账号</button>
                        <button type="button" class="btn btn-secondary" onclick="adminSystem.closeModal()">❌ 取消</button>
                    </div>
                </form>
            </div>
        `;
        
        this.showModal('🆕 为客户创建登录账号', content);
        
        document.getElementById('createAccountForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCustomerAccount(customerId);
        });
    }

    saveCustomerAccount(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        const password = document.getElementById('accountPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            this.showMessage('两次输入的密码不一致', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showMessage('密码长度至少6位', 'error');
            return;
        }
        
        // 获取现有客户账号列表
        const clients = JSON.parse(localStorage.getItem('clients') || '[]');
        
        // 创建新账号
        const newClient = {
            id: Date.now().toString(),
            name: customer.name,
            phone: customer.phone,
            password: password,
            customerId: customerId,
            createdAt: new Date().toISOString()
        };
        
        clients.push(newClient);
        localStorage.setItem('clients', JSON.stringify(clients));
        
        this.closeModal();
        this.loadCustomers(); // 刷新客户列表
        this.showMessage(`已为 ${customer.name} 创建登录账号`, 'success');
    }

    searchCustomers(query) {
        const filteredCustomers = this.customers.filter(customer => 
            customer.name.toLowerCase().includes(query.toLowerCase()) ||
            customer.phone.includes(query)
        );
        
        const tbody = document.querySelector('#customersTable tbody');
        tbody.innerHTML = filteredCustomers.map(customer => {
            const hasAccount = this.checkIfCustomerHasAccount(customer.phone);
            return `
                <tr>
                    <td>${customer.name}</td>
                    <td>${customer.phone}</td>
                    <td>${customer.age}</td>
                    <td>${customer.registrationDate}</td>
                    <td>${customer.lastVisit || '未就诊'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="adminSystem.editCustomer('${customer.id}')">编辑</button>
                        ${hasAccount ? 
                            '<span class="account-status">✅ 已有账号</span>' : 
                            `<button class="btn btn-sm btn-success" onclick="adminSystem.createCustomerAccount('${customer.id}')">创建账号</button>`
                        }
                        <button class="btn btn-sm btn-danger" onclick="adminSystem.deleteCustomer('${customer.id}')">删除</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    searchRecords(query) {
        const filteredRecords = this.records.filter(record => 
            record.customerName.toLowerCase().includes(query.toLowerCase()) ||
            record.treatment.toLowerCase().includes(query.toLowerCase())
        );
        
        const tbody = document.querySelector('#recordsTable tbody');
        tbody.innerHTML = filteredRecords.map(record => `
            <tr>
                <td>${record.customerName}</td>
                <td>${record.date}</td>
                <td>${record.treatment}</td>
                <td>${record.symptoms}</td>
                <td>${record.plan}</td>
                <td>RM ${record.fee}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="adminSystem.editRecord('${record.id}')">编辑</button>
                    <button class="btn btn-sm btn-danger" onclick="adminSystem.deleteRecord('${record.id}')">删除</button>
                </td>
            </tr>
        `).join('');
    }

    // 加载密码重置请求
    loadPasswordResetRequests() {
        const requests = JSON.parse(localStorage.getItem('passwordResetRequests') || '[]');
        const tbody = document.getElementById('resetRequestsBody');
        
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        requests.forEach(request => {
            const row = document.createElement('tr');
            const statusClass = request.status === 'pending' ? 'status-pending' : 
                               request.status === 'approved' ? 'status-confirmed' : 'status-cancelled';
            
            row.innerHTML = `
                <td>${request.clientName}</td>
                <td>${request.phone}</td>
                <td>${new Date(request.requestTime).toLocaleString()}</td>
                <td><span class="status-badge ${statusClass}">${this.getStatusText(request.status)}</span></td>
                <td>
                    ${request.status === 'pending' ? `
                        <button onclick="adminSystem.approvePasswordReset('${request.id}')" class="btn btn-sm btn-success">批准</button>
                        <button onclick="adminSystem.rejectPasswordReset('${request.id}')" class="btn btn-sm btn-danger">拒绝</button>
                    ` : '-'}
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // 批准密码重置
    approvePasswordReset(requestId) {
        this.showConfirmModal(
            '🔑 批准密码重置',
            '<div class="confirm-content"><p>确定要批准这个密码重置请求吗？</p></div>',
            () => {
                const requests = JSON.parse(localStorage.getItem('passwordResetRequests') || '[]');
                const request = requests.find(r => r.id == requestId);
                
                if (request) {
                    // 生成新密码
                    const newPassword = this.generateRandomPassword();
                    
                    // 更新客户密码
                    const clients = JSON.parse(localStorage.getItem('clients') || '[]');
                    const client = clients.find(c => c.phone === request.phone);
                    if (client) {
                        client.password = newPassword;
                        localStorage.setItem('clients', JSON.stringify(clients));
                    }
                    
                    // 更新请求状态
                    request.status = 'approved';
                    request.newPassword = newPassword;
                    request.processTime = new Date().toISOString();
                    localStorage.setItem('passwordResetRequests', JSON.stringify(requests));
                    
                    this.showMessage(`密码重置成功！新密码：${newPassword}\n请通知客户新密码`, 'success');
                    this.loadPasswordResetRequests();
                }
            }
        );
    }

    // 拒绝密码重置
    rejectPasswordReset(requestId) {
        this.showConfirmModal(
            '❌ 拒绝密码重置',
            '<div class="confirm-content"><p>确定要拒绝这个密码重置请求吗？</p></div>',
            () => {
                const requests = JSON.parse(localStorage.getItem('passwordResetRequests') || '[]');
                const request = requests.find(r => r.id == requestId);
                
                if (request) {
                    request.status = 'rejected';
                    request.processTime = new Date().toISOString();
                    localStorage.setItem('passwordResetRequests', JSON.stringify(requests));
                    
                    this.showMessage('密码重置请求已拒绝', 'success');
                    this.loadPasswordResetRequests();
                }
            }
        );
    }

    // 生成随机密码
    generateRandomPassword() {
        const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let password = '';
        for (let i = 0; i < 8; i++) {
            password += chars[Math.floor(Math.random() * chars.length)];
        }
        return password;
    }

    // 加载预约时间设置
    loadAppointmentTimeSettings() {
        const settings = JSON.parse(localStorage.getItem('appointmentTimeSettings') || '{}');
        
        if (settings.startTime) {
            const startTimeInput = document.getElementById('appointmentStartTime');
            const endTimeInput = document.getElementById('appointmentEndTime');
            const intervalSelect = document.getElementById('appointmentInterval');
            
            if (startTimeInput) startTimeInput.value = settings.startTime;
            if (endTimeInput) endTimeInput.value = settings.endTime;
            if (intervalSelect) intervalSelect.value = settings.interval || 60;
        }
    }

    // 更新预约时间选项
    updateAppointmentTimeOptions() {
        const settings = JSON.parse(localStorage.getItem('appointmentTimeSettings') || '{}');
        const timeSelect = document.getElementById('appointmentTime');
        
        if (!timeSelect || !settings.startTime || !settings.endTime) return;
        
        const startTime = settings.startTime;
        const endTime = settings.endTime;
        const interval = settings.interval || 60;
        
        // 清空现有选项
        timeSelect.innerHTML = '<option value="">请选择时间</option>';
        
        // 生成时间选项
        const start = new Date(`2000-01-01 ${startTime}`);
        const end = new Date(`2000-01-01 ${endTime}`);
        
        while (start < end) {
            const timeString = start.toTimeString().slice(0, 5);
            const option = document.createElement('option');
            option.value = timeString;
            option.textContent = timeString;
            timeSelect.appendChild(option);
            
            start.setMinutes(start.getMinutes() + interval);
        }
    }

    // 保存预约时间设置
    saveAppointmentTimeSettings() {
        const startTime = document.getElementById('appointmentStartTime').value;
        const endTime = document.getElementById('appointmentEndTime').value;
        const interval = parseInt(document.getElementById('appointmentInterval').value);
        
        const settings = {
            startTime,
            endTime,
            interval
        };
        
        localStorage.setItem('appointmentTimeSettings', JSON.stringify(settings));
        this.updateAppointmentTimeOptions();
        this.showMessage('预约时间设置已保存', 'success');
    }

    // 时间段管理
    initTimeGroupsManagement() {
        this.loadTimeGroups();
        
        const addTimeGroupForm = document.getElementById('addTimeGroupForm');
        if (addTimeGroupForm) {
            addTimeGroupForm.addEventListener('submit', (e) => this.handleAddTimeGroup(e));
        }
    }

    // 加载时间段
    loadTimeGroups() {
        this.timeGroups = JSON.parse(localStorage.getItem('timeGroups') || '[]');
        this.renderTimeGroups();
        this.updateAppointmentTimeOptionsFromGroups();
    }

    // 渲染时间段列表
    renderTimeGroups() {
        const container = document.getElementById('timeGroupsList');
        if (!container) return;
        
        if (this.timeGroups.length === 0) {
            container.innerHTML = '<div class="empty-groups">暂无时间段，请添加新的时间段</div>';
            return;
        }
        
        container.innerHTML = this.timeGroups.map(group => `
            <div class="time-group-item" data-id="${group.id}">
                <div class="group-info">
                    <span class="group-name">${group.name}</span>
                    <span class="group-time">${group.startTime} - ${group.endTime}</span>
                </div>
                <div class="group-actions">
                    <button class="btn-edit" onclick="adminSystem.editTimeGroup('${group.id}')" title="编辑">
                        ✏️ 编辑
                    </button>
                    <button class="btn-delete" onclick="adminSystem.deleteTimeGroup('${group.id}')" title="删除">
                        🗑️ 删除
                    </button>
                </div>
            </div>
        `).join('');
    }

    // 添加时间段
    handleAddTimeGroup(e) {
        e.preventDefault();
        
        const groupName = document.getElementById('groupName').value.trim();
        const startTime = document.getElementById('groupStartTime').value;
        const endTime = document.getElementById('groupEndTime').value;
        
        // 验证时间
        if (startTime >= endTime) {
            this.showMessage('结束时间必须晚于开始时间', 'error');
            return;
        }
        
        // 检查时间冲突
        const hasConflict = this.timeGroups.some(group => {
            return (startTime < group.endTime && endTime > group.startTime);
        });
        
        if (hasConflict) {
            this.showMessage('时间段与现有时间段冲突，请重新选择', 'error');
            return;
        }
        
        // 添加新时间段
        const newGroup = {
            id: Date.now().toString(),
            name: groupName,
            startTime: startTime,
            endTime: endTime,
            createdAt: new Date().toISOString()
        };
        
        this.timeGroups.push(newGroup);
        this.timeGroups.sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        localStorage.setItem('timeGroups', JSON.stringify(this.timeGroups));
        
        // 清空表单
        document.getElementById('addTimeGroupForm').reset();
        
        // 重新渲染
        this.renderTimeGroups();
        this.updateAppointmentTimeOptionsFromGroups();
        
        this.showMessage(`时间段 "${groupName}" 添加成功`, 'success');
    }

    // 编辑时间段
    editTimeGroup(groupId) {
        const group = this.timeGroups.find(g => g.id === groupId);
        if (!group) return;
        
        const content = `
            <div class="modern-form">
                <form id="editTimeGroupForm">
                    <div class="form-group">
                        <label><i class="icon">📝</i> 时间段名称</label>
                        <input type="text" id="editGroupName" value="${group.name}" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="icon">🕐</i> 开始时间</label>
                            <input type="time" id="editGroupStartTime" value="${group.startTime}" required>
                        </div>
                        <div class="form-group">
                            <label><i class="icon">🕐</i> 结束时间</label>
                            <input type="time" id="editGroupEndTime" value="${group.endTime}" required>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">💾 保存修改</button>
                        <button type="button" class="btn btn-secondary" onclick="adminSystem.closeModal()">❌ 取消</button>
                    </div>
                </form>
            </div>
        `;
        
        this.showModal('✏️ 编辑时间段', content);
        
        document.getElementById('editTimeGroupForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateTimeGroup(groupId);
        });
    }

    // 更新时间段
    updateTimeGroup(groupId) {
        const newName = document.getElementById('editGroupName').value.trim();
        const newStartTime = document.getElementById('editGroupStartTime').value;
        const newEndTime = document.getElementById('editGroupEndTime').value;
        
        if (newStartTime >= newEndTime) {
            this.showMessage('结束时间必须晚于开始时间', 'error');
            return;
        }
        
        // 检查与其他时间段的冲突（排除当前编辑的时间段）
        const hasConflict = this.timeGroups.some(g => {
            return g.id !== groupId && (newStartTime < g.endTime && newEndTime > g.startTime);
        });
        
        if (hasConflict) {
            this.showMessage('时间段与其他时间段冲突', 'error');
            return;
        }
        
        // 更新时间段
        const group = this.timeGroups.find(g => g.id === groupId);
        group.name = newName;
        group.startTime = newStartTime;
        group.endTime = newEndTime;
        group.updatedAt = new Date().toISOString();
        
        this.timeGroups.sort((a, b) => a.startTime.localeCompare(b.startTime));
        localStorage.setItem('timeGroups', JSON.stringify(this.timeGroups));
        
        this.renderTimeGroups();
        this.updateAppointmentTimeOptionsFromGroups();
        this.closeModal();
        
        this.showMessage(`时间段 "${newName}" 更新成功`, 'success');
    }

    // 删除时间段
    deleteTimeGroup(groupId) {
        const group = this.timeGroups.find(g => g.id === groupId);
        if (!group) return;
        
        this.showConfirmModal(
            '🗑️ 删除时间段确认',
            `<div class="confirm-content">
                <p><strong>确定要删除时间段 "${group.name}" 吗？</strong></p>
                <div class="warning-box">
                    <p><strong>时间范围：</strong>${group.startTime} - ${group.endTime}</p>
                    <p>⚠️ <strong>此操作无法恢复！</strong></p>
                </div>
            </div>`,
            () => {
                this.timeGroups = this.timeGroups.filter(g => g.id !== groupId);
                localStorage.setItem('timeGroups', JSON.stringify(this.timeGroups));
                
                this.renderTimeGroups();
                this.updateAppointmentTimeOptionsFromGroups();
                
                this.showMessage(`时间段 "${group.name}" 已删除`, 'success');
            }
        );
    }

    // 更新预约时间选项（基于时间段）
    updateAppointmentTimeOptionsFromGroups() {
        const timeSelect = document.getElementById('appointmentTime');
        if (!timeSelect) return;
        
        // 清空现有选项
        timeSelect.innerHTML = '<option value="">请选择时间</option>';
        
        // 根据时间段生成选项
        this.timeGroups.forEach(group => {
            const option = document.createElement('option');
            option.value = `${group.startTime}-${group.endTime}`;
            option.textContent = `${group.name} (${group.startTime}-${group.endTime})`;
            timeSelect.appendChild(option);
        });
    }

    // 添加数据迁移方法
    migrateAppointmentData() {
        const appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
        let needsUpdate = false;
        
        const migratedAppointments = appointments.map(apt => {
            if (apt.clientName && !apt.customerName) {
                needsUpdate = true;
                return {
                    ...apt,
                    customerName: apt.clientName,
                    service: apt.symptoms || '整骨治疗',
                    notes: apt.symptoms
                };
            }
            return apt;
        });
        
        if (needsUpdate) {
            localStorage.setItem('appointments', JSON.stringify(migratedAppointments));
            console.log('预约数据已迁移');
        }
    }
}

// 初始化管理系统
const adminSystem = new AdminSystem();

// 添加样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .message {
        animation: slideIn 0.3s ease;
    }
`;
document.head.appendChild(style);