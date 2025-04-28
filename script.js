document.addEventListener('DOMContentLoaded', function() {
    // 表单验证
    const analysisForm = document.getElementById('analysis-form');
    if (analysisForm) {
        analysisForm.addEventListener('submit', function(event) {
            const file1 = document.getElementById('file_t1').files[0];
            const file2 = document.getElementById('file_t2').files[0];
            
            if (!file1 || !file2) {
                event.preventDefault();
                showError('请上传两个Excel文件');
                return false;
            }
            
            // 检查文件类型
            if (!isValidExcelFile(file1) || !isValidExcelFile(file2)) {
                event.preventDefault();
                showError('请上传有效的Excel文件 (.xlsx)');
                return false;
            }
            
            // 显示加载指示器
            showLoading();
            return true;
        });
    }
    
    // 设置自定义文件输入触发器
    setupFileInputTriggers();
    
    // 设置置信水平显示
    setupConfidenceLevelDisplay();
    
    // 结果表格增强（如果在结果页面）
    enhanceResultsTable();
    
    // 添加悬停提示信息
    setupTooltips();
    
    // 添加动画效果
    setupAnimations();
});

// 设置文件输入触发器
function setupFileInputTriggers() {
    // 第一个文件输入
    const fileTrigger1 = document.getElementById('file_t1_trigger');
    const fileInput1 = document.getElementById('file_t1');
    const fileName1 = document.getElementById('file_name_1');
    
    if (fileTrigger1 && fileInput1) {
        fileTrigger1.addEventListener('click', function() {
            fileInput1.click();
        });
        
        fileInput1.addEventListener('change', function() {
            updateFileName(this, fileName1);
        });
        
        // 拖放功能
        setupDragAndDrop(fileTrigger1, fileInput1, fileName1);
    }
    
    // 第二个文件输入
    const fileTrigger2 = document.getElementById('file_t2_trigger');
    const fileInput2 = document.getElementById('file_t2');
    const fileName2 = document.getElementById('file_name_2');
    
    if (fileTrigger2 && fileInput2) {
        fileTrigger2.addEventListener('click', function() {
            fileInput2.click();
        });
        
        fileInput2.addEventListener('change', function() {
            updateFileName(this, fileName2);
        });
        
        // 拖放功能
        setupDragAndDrop(fileTrigger2, fileInput2, fileName2);
    }
}

// 设置拖放功能
function setupDragAndDrop(dropZone, fileInput, fileNameElement) {
    if (!dropZone || !fileInput) return;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropZone.classList.add('highlight');
    }
    
    function unhighlight() {
        dropZone.classList.remove('highlight');
    }
    
    dropZone.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            fileInput.files = files;
            updateFileName(fileInput, fileNameElement);
        }
    }
}

// 更新文件名显示
function updateFileName(input, fileNameElement) {
    if (!fileNameElement) return;
    
    if (input.files.length > 0) {
        const fileName = input.files[0].name;
        fileNameElement.textContent = fileName;
        fileNameElement.classList.add('has-file');
        
        // 如果不是有效的Excel文件，添加警告样式
        if (!isValidExcelFile(input.files[0])) {
            fileNameElement.classList.add('warning');
        } else {
            fileNameElement.classList.remove('warning');
        }
    } else {
        fileNameElement.textContent = '未选择文件';
        fileNameElement.classList.remove('has-file');
        fileNameElement.classList.remove('warning');
    }
}

// 设置置信水平显示
function setupConfidenceLevelDisplay() {
    const confidenceInput = document.getElementById('confidence_level');
    const confidenceBadge = document.querySelector('.confidence-badge');
    
    if (confidenceInput && confidenceBadge) {
        // 初始显示
        confidenceBadge.textContent = confidenceInput.value + '%';
        
        // 更新显示
        confidenceInput.addEventListener('input', function() {
            confidenceBadge.textContent = this.value + '%';
        });
    }
}

// 验证Excel文件
function isValidExcelFile(file) {
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    return file && (validTypes.includes(file.type) || file.name.endsWith('.xlsx'));
}

// 显示错误信息
function showError(message) {
    const errorElement = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    
    if (errorElement && errorText) {
        errorText.textContent = message;
        errorElement.style.display = 'flex';
        
        // 滚动到顶部以确保用户看到错误
        window.scrollTo({top: 0, behavior: 'smooth'});
        
        // 5秒后自动隐藏
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

// 显示加载状态
function showLoading() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }
    
    const submitButton = document.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
        const originalText = submitButton.innerHTML;
        submitButton.innerHTML = '<div class="spinner" style="width:20px;height:20px;margin-right:10px;"></div> 分析中...';
        
        // 保存原始文本以便恢复
        submitButton.setAttribute('data-original-text', originalText);
    }
}

// 增强结果表格功能
function enhanceResultsTable() {
    const resultsTable = document.querySelector('.results-table');
    if (resultsTable) {
        // 添加排序功能
        const headers = resultsTable.querySelectorAll('th');
        headers.forEach((header, index) => {
            if (index > 0) { // 跳过Parameter列
                header.style.cursor = 'pointer';
                header.addEventListener('click', function() {
                    sortTable(resultsTable, index);
                });
                // 添加排序图标
                const sortIcon = document.createElement('span');
                sortIcon.classList.add('sort-icon');
                sortIcon.innerHTML = ' <i class="fas fa-sort"></i>';
                header.appendChild(sortIcon);
            }
        });
        
        // 添加行高亮效果
        const rows = resultsTable.querySelectorAll('tbody tr');
        rows.forEach(row => {
            row.addEventListener('mouseenter', function() {
                this.classList.add('highlight-row');
            });
            row.addEventListener('mouseleave', function() {
                this.classList.remove('highlight-row');
            });
        });
        
        // 添加单元格数据类型识别
        highlightSignificantValues(resultsTable);
    }
}

// 高亮显示统计学显著的值
function highlightSignificantValues(table) {
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        cells.forEach((cell, index) => {
            // 对P值单元格特殊处理
            if (table.querySelectorAll('th')[index].textContent.includes('P Value')) {
                const value = parseFloat(cell.textContent);
                if (!isNaN(value) && value < 0.05) {
                    cell.classList.add('significant');
                    // 非常显著
                    if (value < 0.01) {
                        cell.classList.add('very-significant');
                    }
                }
            }
        });
    });
}

// 表格排序功能
function sortTable(table, columnIndex) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const headers = table.querySelectorAll('th');
    
    // 获取当前排序方向
    let currentDirection = 'asc';
    const icon = headers[columnIndex].querySelector('.sort-icon i');
    if (icon && icon.classList.contains('fa-sort-up')) {
        currentDirection = 'desc';
    } else if (icon && icon.classList.contains('fa-sort-down')) {
        currentDirection = 'asc';
    }
    
    // 更新排序图标
    headers.forEach((header, i) => {
        const icon = header.querySelector('.sort-icon i');
        if (icon) {
            icon.className = 'fas fa-sort';
        }
    });
    
    const sortIcon = headers[columnIndex].querySelector('.sort-icon i');
    if (sortIcon) {
        sortIcon.className = currentDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
    }
    
    // 排序行
    rows.sort((rowA, rowB) => {
        const cellA = rowA.querySelectorAll('td')[columnIndex];
        const cellB = rowB.querySelectorAll('td')[columnIndex];
        
        // 获取单元格内容
        let textA = cellA.textContent.trim();
        let textB = cellB.textContent.trim();
        
        // 特殊处理P值
        if (textA === '< 0.001') textA = '0.0001';
        if (textB === '< 0.001') textB = '0.0001';
        
        // 尝试将内容转换为数字
        const valueA = isNaN(parseFloat(textA)) ? textA.toLowerCase() : parseFloat(textA);
        const valueB = isNaN(parseFloat(textB)) ? textB.toLowerCase() : parseFloat(textB);
        
        // 比较值
        if (currentDirection === 'asc') {
            if (valueA < valueB) return -1;
            if (valueA > valueB) return 1;
            return 0;
        } else {
            if (valueA > valueB) return -1;
            if (valueA < valueB) return 1;
            return 0;
        }
    });
    
    // 重新添加排序后的行
    rows.forEach(row => tbody.appendChild(row));
    
    // 添加排序后高亮效果
    setTimeout(() => {
        rows.forEach((row, index) => {
            row.style.backgroundColor = '';
            row.style.animation = `fadeIn 0.3s ease-out ${index * 0.03}s forwards`;
        });
    }, 10);
}

// 设置工具提示
function setupTooltips() {
    // 对于静态添加的工具提示，已经在HTML中处理
    
    // 动态添加P值解释
    const resultsTable = document.querySelector('.results-table');
    if (resultsTable) {
        const headers = resultsTable.querySelectorAll('th');
        headers.forEach((header, index) => {
            if (header.textContent.includes('P Value')) {
                const tooltip = document.createElement('div');
                tooltip.classList.add('header-tooltip');
                tooltip.textContent = 'P < 0.05 表示统计学显著差异';
                header.appendChild(tooltip);
                
                header.addEventListener('mouseenter', function() {
                    tooltip.style.display = 'block';
                });
                
                header.addEventListener('mouseleave', function() {
                    tooltip.style.display = 'none';
                });
            }
        });
    }
}

// 添加动画效果
function setupAnimations() {
    // 为卡片添加入场动画
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 * index);
    });
    
    // 为结果表格添加入场动画
    const resultsContainer = document.querySelector('.results-container');
    if (resultsContainer) {
        resultsContainer.style.opacity = '0';
        resultsContainer.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            resultsContainer.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            resultsContainer.style.opacity = '1';
            resultsContainer.style.transform = 'translateY(0)';
        }, 300);
    }
}

// 添加CSS动画规则
function addAnimationStyles() {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        .highlight-row {
            background-color: rgba(147, 112, 219, 0.1) !important;
            transition: background-color 0.3s ease;
        }
        
        .significant {
            color: #e74c3c !important;
            font-weight: bold;
        }
        
        .very-significant {
            color: #c0392b !important;
            font-weight: bold;
        }
        
        .header-tooltip {
            display: none;
            position: absolute;
            background: #274472;
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: normal;
            white-space: nowrap;
            z-index: 100;
            bottom: -30px;
            left: 50%;
            transform: translateX(-50%);
        }
        
        .custom-file-input.highlight {
            border-color: #4a6fa5;
            background-color: rgba(147, 112, 219, 0.1);
        }
    `;
    document.head.appendChild(styleSheet);
}

// 确保动画样式被添加
addAnimationStyles();
