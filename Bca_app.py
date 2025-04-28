from flask import Flask, render_template, request, send_file
import pandas as pd
import numpy as np
from scipy import stats
from arch.bootstrap import IIDBootstrap
import io
import os

app = Flask(__name__)

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    # 获取表单参数
    patient_id_col = request.form.get('patient_id_col', 'PatientID')
    n_reps_bootstrap = int(request.form.get('n_reps_bootstrap', 2999))
    confidence_level_percent = float(request.form.get('confidence_level', 95.0))
    confidence_level = confidence_level_percent / 100.0
    
    # 获取上传的文件
    file_t1 = request.files['file_t1']
    file_t2 = request.files['file_t2']
    
    # 检查文件是否存在
    if not file_t1 or not file_t2:
        return render_template('index.html', error="请上传两个Excel文件")
    
    # 读取Excel文件
    try:
        df_t1 = pd.read_excel(file_t1, engine='openpyxl')
        df_t2 = pd.read_excel(file_t2, engine='openpyxl')
    except Exception as e:
        return render_template('index.html', error=f"读取文件失败: {str(e)}")
    
    # 验证Patient ID列
    if patient_id_col not in df_t1.columns or patient_id_col not in df_t2.columns:
        return render_template('index.html', error=f"找不到列: {patient_id_col}")
    
    # 分析代码 (从BCa.py移植)
    # ... [复制BCa.py中的分析逻辑] ...
    
    # 这里简化版本的分析逻辑:
    def stat_mean(x):
        if len(x) == 0:
            return np.nan
        return np.nanmean(x)
    
    # 查找共同的测量指标列
    measurement_cols_t1 = set(df_t1.columns) - {patient_id_col}
    measurement_cols_t2 = set(df_t2.columns) - {patient_id_col}
    common_measurement_cols = sorted(list(measurement_cols_t1 & measurement_cols_t2))
    
    if not common_measurement_cols:
        return render_template('index.html', error="两个文件中未找到共同的测量指标列")
    
    # 合并数据
    df_merged = pd.merge(
        df_t1, df_t2,
        on=patient_id_col, how='inner',
        suffixes=('_T1', '_T2')
    )
    
    if df_merged.empty:
        return render_template('index.html', error="未找到匹配的患者数据")
    
    # 动态生成CI列名
    ci_lower_col_name = f"Lower {confidence_level_percent:.1f}% CI"
    ci_upper_col_name = f"Upper {confidence_level_percent:.1f}% CI"
    
    # 初始化结果列表
    results = []
    
    for base_name in common_measurement_cols:
        col1_name = base_name + '_T1'
        col2_name = base_name + '_T2'
        
        # 处理当前指标
        try:
            paired_data = df_merged[[col1_name, col2_name]].dropna()
            n_valid_pairs = len(paired_data)
            
            if n_valid_pairs < 2:
                results.append({
                    "Parameter": base_name,
                    "Mean (Diff)": np.nan,
                    "Bias": np.nan,
                    "Std. Error": np.nan,
                    ci_lower_col_name: "数据不足",
                    ci_upper_col_name: "数据不足",
                    "P Value (Wilcoxon)": np.nan,
                    "CI Method": ""
                })
                continue
            
            measurement_1 = paired_data[col1_name].values
            measurement_2 = paired_data[col2_name].values
            differences = measurement_1 - measurement_2
            
            # 计算原始差值均值
            mean_diff_val = stat_mean(differences)
            
            # 执行Bootstrap
            bs = IIDBootstrap(differences, seed=42)
            
            # 计算偏差和标准误
            bootstrap_reps = bs.apply(stat_mean, reps=n_reps_bootstrap)
            valid_bootstrap_reps = bootstrap_reps[~np.isnan(bootstrap_reps)]
            
            if len(valid_bootstrap_reps) > 1:
                std_err_val = np.std(valid_bootstrap_reps, ddof=1)
                bias_val = np.mean(valid_bootstrap_reps) - mean_diff_val
            else:
                std_err_val = np.nan
                bias_val = np.nan
            
            # 计算BCa置信区间
            ci_method_used = ""
            try:
                ci = bs.conf_int(stat_mean, reps=n_reps_bootstrap, size=confidence_level, method='bca')
                
                if isinstance(ci, np.ndarray) and ci.shape == (2, 1):
                    lower_ci_val = float(ci[0, 0])
                    upper_ci_val = float(ci[1, 0])
                    ci_method_used = "BCa"
                elif isinstance(ci, (list, tuple)) and len(ci) == 2:
                    lower_ci_val = float(np.asarray(ci[0]).item())
                    upper_ci_val = float(np.asarray(ci[1]).item())
                    ci_method_used = "BCa"
                else:
                    raise ValueError("BCa CI返回值无效")
            except:
                # 尝试百分位法
                try:
                    ci = bs.conf_int(stat_mean, reps=n_reps_bootstrap, size=confidence_level, method='percentile')
                    
                    if isinstance(ci, np.ndarray) and ci.shape == (2, 1):
                        lower_ci_val = float(ci[0, 0])
                        upper_ci_val = float(ci[1, 0])
                        ci_method_used = "Percentile"
                    elif isinstance(ci, (list, tuple)) and len(ci) == 2:
                        lower_ci_val = float(np.asarray(ci[0]).item())
                        upper_ci_val = float(np.asarray(ci[1]).item())
                        ci_method_used = "Percentile"
                    else:
                        lower_ci_val = "计算错误"
                        upper_ci_val = "计算错误"
                except:
                    lower_ci_val = "计算错误"
                    upper_ci_val = "计算错误"
            
            # 执行Wilcoxon检验
            try:
                if np.all(differences == 0):
                    wilcoxon_p_val = 1.0
                elif len(np.unique(differences[differences != 0])) < 1 and n_valid_pairs < 10:
                    wilcoxon_p_val = np.nan
                else:
                    _, wilcoxon_p_val = stats.wilcoxon(measurement_1, measurement_2)
            except:
                wilcoxon_p_val = np.nan
            
            # 存储结果
            results.append({
                "Parameter": base_name,
                "Mean (Diff)": mean_diff_val,
                "Bias": bias_val,
                "Std. Error": std_err_val,
                ci_lower_col_name: lower_ci_val,
                ci_upper_col_name: upper_ci_val,
                "P Value (Wilcoxon)": wilcoxon_p_val,
                "CI Method": ci_method_used
            })
            
        except Exception as e:
            results.append({
                "Parameter": base_name,
                "Mean (Diff)": np.nan,
                "Bias": np.nan,
                "Std. Error": np.nan,
                ci_lower_col_name: f"错误: {str(e)}",
                ci_upper_col_name: "",
                "P Value (Wilcoxon)": np.nan,
                "CI Method": ""
            })
    
    # 创建结果DataFrame
    results_df = pd.DataFrame(results)
    
    # 将结果保存为CSV文件
    csv_buffer = io.BytesIO()
    results_df.to_csv(csv_buffer, index=False, encoding='utf-8-sig')
    csv_buffer.seek(0)
    
    # 将CSV数据传递给模板
    csv_data = csv_buffer.getvalue().decode('utf-8-sig')
    
    return render_template('results.html', 
                          results=results, 
                          columns=results_df.columns.tolist(),
                          csv_data=csv_data)

@app.route('/download_csv', methods=['POST'])
def download_csv():
    csv_data = request.form.get('csv_data', '')
    buffer = io.BytesIO()
    buffer.write(csv_data.encode('utf-8-sig'))
    buffer.seek(0)
    
    return send_file(
        buffer,
        as_attachment=True,
        download_name='bca_analysis_results.csv',
        mimetype='text/csv'
    )

if __name__ == '__main__':
    app.run(debug=True)
