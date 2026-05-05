<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// 安全配置
$pwd_file    = 'pwd.txt';
$list_file   = 'list.txt';
$status_file = 'status.txt';
$notice_file = 'notice.json';
$cert_file   = 'cert.json';
$log_file    = 'visit_log.json';
$basic_file  = 'basic.json';
$sstv_file   = 'sstv.json';
$sstv_history_file = 'sstv_history.json';
$stats_file  = 'stats.json';
$features_file = 'features.json';
$default_pwd = 'e10adc3949ba59abbe56e057f20f883e';
$session_file = 'session.json';
$session_ttl  = 7200; // 2 hours in seconds (延长Session有效期)
$rate_limit_file = 'rate_limit.json';
$unlock_code_file = 'unlock.txt';
$max_login_attempts = 5;
$rate_limit_window = 900; // 15 minutes
$api_rate_limit_file = 'api_rate_limit.json';
$csrf_token_file = 'csrf_tokens.json';
$system_version = '2.8.3';
$system_version_name = '移动端优化版';

// 日志级别
define('LOG_DEBUG', 0);
define('LOG_INFO', 1);
define('LOG_WARNING', 2);
define('LOG_ERROR', 3);
define('LOG_CRITICAL', 4);
$log_level = LOG_INFO;

// 初始化文件
if (!file_exists($pwd_file))
    file_put_contents($pwd_file, $default_pwd);
if (!file_exists($list_file))
    file_put_contents($list_file, '');
if (!file_exists($status_file))
    file_put_contents($status_file, '0');
if (!file_exists($notice_file))
    file_put_contents($notice_file, json_encode([
        'enable'  => '0',
        'content' => '欢迎使用湖北FMO中继点名系统',
        'mode'    => 'daily',
        'delay'   => '1'
    ], JSON_UNESCAPED_UNICODE));
if (!file_exists($cert_file))
    file_put_contents($cert_file, json_encode([
        'title'   => '点名参与证书',
        'sub'     => '湖北FMO中继节点',
        'label'   => '兹证明',
        'desc'    => '已成功参与湖北FMO中继台例行点名活动\n表现良好，特此发证',
        'template' => 'classic',
        'templates' => [
            'classic' => [
                'name' => '经典红金',
                'borderColor' => '#8b0000',
                'borderInner' => '#b8860b',
                'titleColor' => '#8b0000',
                'bgPattern' => 'classic',
                'signColor' => '#1a1a6c'
            ],
            'modern' => [
                'name' => '现代蓝白',
                'borderColor' => '#1d4ed8',
                'borderInner' => '#60a5fa',
                'titleColor' => '#1d4ed8',
                'bgPattern' => 'modern',
                'signColor' => '#1e3a5f'
            ],
            'elegant' => [
                'name' => '典雅墨绿',
                'borderColor' => '#14532d',
                'borderInner' => '#a7f3d0',
                'titleColor' => '#14532d',
                'bgPattern' => 'elegant',
                'signColor' => '#14532d'
            ],
            'luxury' => [
                'name' => '奢华黑金',
                'borderColor' => '#1c1917',
                'borderInner' => '#fbbf24',
                'titleColor' => '#92400e',
                'bgPattern' => 'luxury',
                'signColor' => '#78350f'
            ]
        ]
    ], JSON_UNESCAPED_UNICODE));
if (!file_exists($log_file))
    file_put_contents($log_file, json_encode([], JSON_UNESCAPED_UNICODE));
if (!file_exists($session_file))
    file_put_contents($session_file, json_encode([]));
if (!file_exists($unlock_code_file))
    file_put_contents($unlock_code_file, md5('FMO2025'));
if (!file_exists($rate_limit_file))
    file_put_contents($rate_limit_file, json_encode([]));
if (!file_exists($basic_file))
    file_put_contents($basic_file, json_encode([
        'certYear'      => '',
        'certMonth'     => '',
        'certDay'       => '',
        'certPrefix'    => 'FMO-',
        'certNumYear'   => '',
        'certNumMonth'  => '',
        'certNumDay'    => ''
    ], JSON_UNESCAPED_UNICODE));
if (!file_exists($sstv_file))
    file_put_contents($sstv_file, json_encode([
        'enable' => '0'
    ], JSON_UNESCAPED_UNICODE));
if (!file_exists($sstv_history_file))
    file_put_contents($sstv_history_file, json_encode([], JSON_UNESCAPED_UNICODE));
if (!file_exists($stats_file))
    file_put_contents($stats_file, json_encode([
        'download_count' => 0,
        'query_count' => 0,
        'query_history' => [],
        'download_history' => []
    ], JSON_UNESCAPED_UNICODE));
if (!file_exists($features_file))
    file_put_contents($features_file, json_encode([
        'verify_enabled' => '1',
        'honor_wall_enabled' => '1',
        'chart_enabled' => '1',
        'share_enabled' => '1',
        'voice_enabled' => '0',
        'monthly_rank_enabled' => '1',
        'batch_export_enabled' => '1',
        'webhook_enabled' => '0',
        'webhook_url' => '',
        'webhook_type' => 'wechat',
        'dark_mode' => '0',
    'audio_card_enabled' => '1',
    'bigscreen_enabled' => '0',
    'ecard_enabled' => '1'
    ], JSON_UNESCAPED_UNICODE));
if (!file_exists($api_rate_limit_file))
    file_put_contents($api_rate_limit_file, json_encode([]));
if (!file_exists($csrf_token_file))
    file_put_contents($csrf_token_file, json_encode([]));

// 证书分享token文件
$share_tokens_file = 'share_tokens.json';
if (!file_exists($share_tokens_file))
    file_put_contents($share_tokens_file, json_encode([], JSON_UNESCAPED_UNICODE));

// 活动通知文件
// 意见反馈文件
$feedback_file = 'feedback.json';
if (!file_exists($feedback_file))
    file_put_contents($feedback_file, json_encode([], JSON_UNESCAPED_UNICODE));

$activity_file = 'activity.json';
if (!file_exists($activity_file))
    file_put_contents($activity_file, json_encode([
        'enabled' => '0',
        'title' => '',
        'content' => '',
        'date' => '',
        'time' => '',
        'frequency' => '',
        'location' => '',
        'notes' => '',
        'updated' => ''
    ], JSON_UNESCAPED_UNICODE));

// IP归属地缓存文件
$ip_cache_file = 'ip_location_cache.json';
if (!file_exists($ip_cache_file))
    file_put_contents($ip_cache_file, '{}');

// 安全验证函数
function verify_request_origin() {
    $allowed_origins = [
        'http://localhost',
        'http://localhost:8000',
        'http://127.0.0.1',
        'http://127.0.0.1:8000',
        'https://yourdomain.com'
    ];
    
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    
    if (empty($origin) && empty($referer)) {
        return false;
    }
    
    if (!empty($origin)) {
        $host = parse_url($origin, PHP_URL_HOST);
        if (!in_array($host, ['localhost', '127.0.0.1', 'yourdomain.com'])) {
            return false;
        }
    }
    
    if (!empty($referer)) {
        $host = parse_url($referer, PHP_URL_HOST);
        if (!in_array($host, ['localhost', '127.0.0.1', 'yourdomain.com'])) {
            return false;
        }
    }
    
    return true;
}

// 公开API限流（每分钟最多30次）
function check_api_rate_limit($ip, $action) {
    global $api_rate_limit_file;
    $data = json_decode(file_get_contents($api_rate_limit_file), true) ?? [];
    $now = time();
    
    // 清理1分钟前的记录
    $data = array_filter($data, function($item) use ($now) {
        return $item['time'] > $now - 60;
    });
    
    // 检查当前IP+action的请求次数
    $attempts = array_filter($data, function($item) use ($ip, $action) {
        return $item['ip'] === $ip && $item['action'] === $action;
    });
    
    if (count($attempts) >= 30) {
        return false;
    }
    
    // 记录本次请求
    $data[] = [
        'ip' => $ip,
        'action' => $action,
        'time' => $now
    ];
    
    safe_write($api_rate_limit_file, json_encode($data));
    return true;
}

function check_rate_limit($ip) {
    global $rate_limit_file, $max_login_attempts, $rate_limit_window;
    
    $data = json_decode(file_get_contents($rate_limit_file), true) ?? [];
    $now = time();
    
    $data = array_filter($data, function($item) use ($now) {
        return $item['time'] > $now - 900;
    });
    
    $attempts = array_filter($data, function($item) use ($ip) {
        return $item['ip'] === $ip;
    });
    
    if (count($attempts) >= 5) {
        return false;
    }
    
    return true;
}

function record_login_attempt($ip, $success = false) {
    global $rate_limit_file;
    
    $data = json_decode(file_get_contents($rate_limit_file), true) ?? [];
    
    $now = time();
    $data = array_filter($data, function($item) use ($now) {
        return $item['time'] > $now - 900;
    });
    
    if (!$success) {
        $data[] = [
            'ip' => $ip,
            'time' => time(),
            'success' => false
        ];
    }
    
    safe_write($rate_limit_file, json_encode($data));
}

function generate_token() {
    return bin2hex(random_bytes(32));
}

function clean_sessions() {
    global $session_file, $session_ttl;
    $sessions = json_decode(file_get_contents($session_file), true) ?? [];
    $now = time();
    $valid = [];
    foreach ($sessions as $token => $expiry) {
        if ($expiry > $now) {
            $valid[$token] = $expiry;
        }
    }
    safe_write($session_file, json_encode($valid));
}

function verify_session_token($token) {
    global $session_file;
    if (empty($token)) return false;
    $sessions = json_decode(file_get_contents($session_file), true) ?? [];
    if (!isset($sessions[$token])) return false;
    if ($sessions[$token] <= time()) return false;
    return true;
}

function save_session_token($token) {
    global $session_file, $session_ttl;
    clean_sessions();
    $sessions = json_decode(file_get_contents($session_file), true) ?? [];
    $sessions[$token] = time() + $session_ttl;
    safe_write($session_file, json_encode($sessions));
}

function check_auth($data) {
    $token = $data['token'] ?? '';
    if (!empty($token) && verify_session_token($token)) {
        return true;
    }
    return check_pwd($data['pwd'] ?? '');
}

function getRealIP() {
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ips = array_map('trim', explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']));
        foreach ($ips as $ip) {
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return $ip;
            }
        }
    }
    if (!empty($_SERVER['HTTP_X_REAL_IP'])) {
        return trim($_SERVER['HTTP_X_REAL_IP']);
    }
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function getIPLocation($ip) {
    if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
        return '内网IP';
    }
    global $ip_cache_file;
    // 读取缓存
    $cache = json_decode(@file_get_contents($ip_cache_file), true) ?? [];
    if (isset($cache[$ip]) && ($cache[$ip]['expires'] ?? 0) > time()) {
        return $cache[$ip]['location'];
    }
    // 缓存未命中，查询外部API
    $url = "https://whois.pconline.com.cn/ipJson.jsp?json=true&ip=$ip";
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 3,
            'header'  => 'User-Agent: Mozilla/5.0'
        ]
    ]);
    $json = @file_get_contents($url, false, $ctx);
    if (!$json) {
        // 查询失败时，如果有旧缓存则继续使用
        if (isset($cache[$ip])) return $cache[$ip]['location'];
        return '查询失败';
    }
    $data = json_decode($json, true);
    $location = $data['addr'] ?? '未知归属地';
    // 写入缓存（缓存7天）
    $cache[$ip] = [
        'location' => $location,
        'expires'  => time() + 7 * 86400
    ];
    // 限制缓存大小（最多1000条）
    if (count($cache) > 1000) {
        // 删除最旧的条目
        $oldest_keys = array_keys(array_slice($cache, 0, 200, true));
        foreach ($oldest_keys as $k) unset($cache[$k]);
    }
    safe_write($ip_cache_file, json_encode($cache, JSON_UNESCAPED_UNICODE));
    return $location;
}

// 增强日志系统
function write_log($type, $level = LOG_INFO, $extra = []) {
    global $log_file, $log_level;
    
    if ($level < $log_level) return;
    
    $ip   = getRealIP();
    $loc  = getIPLocation($ip);
    $time = date('Y-m-d H:i:s');
    $ua   = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 200);
    
    $log_entry = [
        'time'     => $time,
        'type'     => $type,
        'level'    => $level,
        'ip'       => $ip,
        'location' => $loc,
        'agent'    => $ua,
        'action'   => $_GET['action'] ?? 'unknown'
    ];
    
    if (!empty($extra)) {
        $log_entry['extra'] = $extra;
    }

    $log = json_decode(file_get_contents($log_file), true) ?? [];
    $log[] = $log_entry;
    if (count($log) > 500) {
        $log = array_slice($log, -500);
    }
    safe_write($log_file, json_encode($log, JSON_UNESCAPED_UNICODE));
}

function check_pwd($input) {
    global $pwd_file;
    $stored = trim(file_get_contents($pwd_file));
    $input = trim($input);
    
    // 支持bcrypt和MD5两种格式
    if (password_verify($input, $stored)) return true;
    if ($input === $stored) return true;
    if (md5($input) === $stored) return true;
    return false;
}

// 自动备份（关键操作前自动保存快照）
function auto_backup($reason = 'auto') {
    global $pwd_file, $list_file, $status_file, $notice_file, $cert_file, $basic_file, $features_file, $unlock_code_file, $sstv_file, $stats_file, $log_file;
    $backup_dir = 'backups';
    if (!is_dir($backup_dir)) mkdir($backup_dir, 0755, true);
    $backup = [
        'version' => '2.5.0',
        'reason' => $reason,
        'time' => date('Y-m-d H:i:s'),
        'pwd' => file_get_contents($pwd_file),
        'list' => file_get_contents($list_file),
        'status' => file_get_contents($status_file),
        'notice' => file_get_contents($notice_file),
        'cert' => file_get_contents($cert_file),
        'basic' => file_get_contents($basic_file),
        'features' => file_get_contents($features_file),
        'unlock' => file_get_contents($unlock_code_file),
        'sstv' => file_get_contents($sstv_file),
        'stats' => file_get_contents($stats_file),
        'log' => file_get_contents($log_file)
    ];
    $backup_file = $backup_dir . '/auto_' . date('Ymd_His') . '_' . $reason . '.json';
    safe_write($backup_file, json_encode($backup, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    // 清理超过30天的自动备份
    $files = glob($backup_dir . '/auto_*.json');
    $now = time();
    foreach ($files as $f) {
        if ($now - filemtime($f) > 30 * 86400) @unlink($f);
    }
    return $backup_file;
}

// 安全写入文件（防止并发数据丢失）
function safe_write($file, $data) {
    $tmpFile = $file . '.tmp';
    $fp = fopen($tmpFile, 'w');
    if ($fp && flock($fp, LOCK_EX)) {
        fwrite($fp, $data);
        flock($fp, LOCK_UN);
        fclose($fp);
        rename($tmpFile, $file);
    } else {
        if ($fp) fclose($fp);
        // 备用写入
        file_put_contents($file, $data);
    }
}

// 过期分享Token自动清理
function clean_expired_shares() {
    global $share_tokens_file;
    $tokens = json_decode(file_get_contents($share_tokens_file), true) ?? [];
    $now = time();
    $tokens = array_filter($tokens, function($t) use ($now) {
        return $t['expires'] === 0 || $t['expires'] > $now;
    });
    safe_write($share_tokens_file, json_encode($tokens, JSON_UNESCAPED_UNICODE));
}

// Webhook发送函数
function send_webhook($url, $type, $message) {
    if (empty($url)) return false;
    $payload = '';
    if ($type === 'wechat') {
        $payload = json_encode(['msgtype' => 'text', 'text' => ['content' => $message]], JSON_UNESCAPED_UNICODE);
    } elseif ($type === 'dingtalk') {
        $payload = json_encode(['msgtype' => 'text', 'text' => ['content' => $message]], JSON_UNESCAPED_UNICODE);
    } elseif ($type === 'feishu') {
        $payload = json_encode(['msg_type' => 'text', 'content' => ['text' => $message]], JSON_UNESCAPED_UNICODE);
    } else {
        $payload = json_encode(['content' => $message], JSON_UNESCAPED_UNICODE);
    }
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return $http_code >= 200 && $http_code < 300;
}

// 触发Webhook通知
function trigger_webhook($event_type, $callsign) {
    global $features_file;
    $features = json_decode(file_get_contents($features_file), true) ?? [];
    if (($features['webhook_enabled'] ?? '0') !== '1') return;
    $url = $features['webhook_url'] ?? '';
    $type = $features['webhook_type'] ?? 'wechat';
    if (empty($url)) return;
    $emoji = $event_type === 'query' ? '🔍' : ($event_type === 'download' ? '📥' : '🛡️');
    $action = $event_type === 'query' ? '查询了证书' : ($event_type === 'download' ? '下载了证书' : '验证了证书');
    $msg = "{$emoji} FMO证书系统通知\n台站 {$callsign} {$action}\n时间：" . date('Y-m-d H:i:s');
    send_webhook($url, $type, $msg);
}

// 输入验证函数
function validate_callsign($call) {
    return preg_match('/^[A-Z0-9]{3,20}$/i', $call);
}

function validate_cert_no($cert_no) {
    return preg_match('/^[A-Z0-9\-]{5,30}$/i', $cert_no);
}

// XSS防护 - 输出编码
function escape_html($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}

// 数据脱敏（用于日志）
function mask_ip($ip) {
    if (filter_var($ip, FILTER_VALIDATE_IP)) {
        $parts = explode('.', $ip);
        if (count($parts) === 4) {
            return $parts[0] . '.' . $parts[1] . '.*.*';
        }
    }
    return $ip;
}

// 主要API逻辑
$action = $_GET['action'] ?? '';
$raw    = file_get_contents('php://input');
$data   = json_decode($raw, true) ?? [];

$public_actions = ['status', 'list', 'get_notice', 'get_cert', 'get_basic', 'record_query', 'record_download', 'get_stats_public', 'verify_cert', 'get_honor_wall', 'get_features', 'record_verify', 'create_share', 'get_share', 'get_monthly_rank', 'search_suggest', 'get_system_info', 'get_about', 'get_bigscreen', 'get_ecard', 'get_sstv', 'get_sstv_history', 'get_activity', 'submit_feedback'];

if (!in_array($action, $public_actions)) {
    $ip = getRealIP();
    
    if (!check_rate_limit($ip)) {
        write_log('admin', LOG_WARNING, ['reason' => 'rate_limit_exceeded']);
        echo json_encode(['code' => 0, 'msg' => '登录尝试次数过多，请15分钟后再试']);
        exit;
    }
}

// 公开API限流检查
// list和status是核心加载接口，免除限流和外部API日志
$no_limit_actions = ['status', 'list', 'get_features', 'get_cert', 'get_basic', 'get_notice', 'get_sstv', 'get_activity', 'get_honor_wall', 'get_ecard'];
if (in_array($action, $public_actions) && !in_array($action, $no_limit_actions)) {
    $ip = getRealIP();
    if (!check_api_rate_limit($ip, $action)) {
        write_log('api', LOG_WARNING, ['action' => $action, 'reason' => 'api_rate_limit']);
        echo json_encode(['code' => 0, 'msg' => '请求过于频繁，请稍后再试']);
        exit;
    }
}

// 轻量日志 - 核心加载路径完全跳过日志写入，避免并发文件锁竞争
function write_log_fast($type) {
    // 不执行任何操作，核心加载接口不需要日志
    // 这些接口被频繁并发调用，任何文件I/O都会导致锁竞争和延迟
}

switch ($action) {
    case 'status':
        write_log_fast('front');
        echo json_encode(['enabled' => (bool)file_get_contents($status_file)]);
        break;

    case 'list':
        write_log_fast('front');
        $lines = file($list_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        echo json_encode(['callList' => array_map('strtoupper', $lines ?: [])]);
        break;

    case 'unlock':
        $code = trim($data['code'] ?? '');
        if (!empty($code) && md5($code) === trim(file_get_contents($unlock_code_file))) {
            write_log('unlock', LOG_INFO);
            echo json_encode(['code' => 1, 'msg' => '验证通过']);
        } else {
            write_log('unlock', LOG_WARNING, ['reason' => 'invalid_code']);
            echo json_encode(['code' => 0, 'msg' => '暗号错误']);
        }
        break;

    case 'check':
        write_log('admin', LOG_INFO, ['action' => 'login_attempt']);
        $ip = getRealIP();
        
        if (!check_rate_limit($ip)) {
            echo json_encode(['code' => 0, 'msg' => '登录尝试次数过多，请15分钟后再试']);
            break;
        }
        
        $inputPwd = $data['pwd'] ?? '';
        $storedPwd = trim(file_get_contents($pwd_file));
        $pwdMatch = password_verify($inputPwd, $storedPwd) || (trim($inputPwd) === $storedPwd) || (md5(trim($inputPwd)) === $storedPwd);
        
        if ($pwdMatch) {
            $token = generate_token();
            save_session_token($token);
            record_login_attempt($ip, true);
            write_log('admin', LOG_INFO, ['action' => 'login_success']);
            echo json_encode(['code' => 1, 'token' => $token, 'expires' => time() + 7200]);
        } else {
            record_login_attempt($ip, false);
            write_log('admin', LOG_WARNING, ['action' => 'login_failed', 'ip' => mask_ip($ip)]);
            echo json_encode(['code' => 0, 'msg' => '密码错误']);
        }
        break;

    case 'verify_token':
        $token = $data['token'] ?? '';
        if (verify_session_token($token)) {
            echo json_encode(['code' => 1, 'msg' => 'token有效']);
        } else {
            echo json_encode(['code' => 0, 'msg' => 'token已过期或无效']);
        }
        break;

    case 'toggle':
        write_log('admin', LOG_INFO, ['action' => 'toggle_query']);
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        safe_write($status_file, $data['enabled'] ? '1' : '0');
        echo json_encode(['code' => 1]);
        break;

    case 'save':
        write_log('admin', LOG_INFO, ['action' => 'save_list']);
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        $list = array_map('strtoupper', array_map('trim', array_filter($data['list'] ?? [])));
        // 验证呼号格式
        $valid_list = array_filter($list, function($call) {
            return validate_callsign($call);
        });
        safe_write($list_file, implode("\n", $valid_list));
        echo json_encode(['code' => 1, 'count' => count($valid_list)]);
        break;

    case 'clear':
        write_log('admin', LOG_WARNING, ['action' => 'clear_all']);
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        auto_backup('before_clear');
        safe_write($list_file, '');
        echo json_encode(['code' => 1]);
        break;

    case 'changepwd':
        write_log('admin', LOG_WARNING, ['action' => 'change_password']);
        if (!check_auth(['token' => $data['token'] ?? '', 'pwd' => $data['old'] ?? ''])) {
            echo json_encode(['code' => 0, 'msg' => '原密码错误']);
            exit;
        }
        auto_backup('before_changepwd');
        $newPwd = trim($data['new'] ?? '');
        if (strlen($newPwd) < 6) {
            echo json_encode(['code' => 0, 'msg' => '新密码至少需要6位']);
            exit;
        }
        // 使用bcrypt加密存储
        $hashedPwd = password_hash($newPwd, PASSWORD_DEFAULT);
        safe_write($pwd_file, $hashedPwd);
        echo json_encode(['code' => 1, 'msg' => '密码修改成功']);
        break;

    case 'get_notice':
        write_log_fast('front');
        $notice = json_decode(file_get_contents($notice_file), true);
        $notice['content'] = escape_html($notice['content'] ?? '');
        echo json_encode(['code' => 1, 'data' => $notice], JSON_UNESCAPED_UNICODE);
        break;

    case 'save_notice':
        write_log('admin', LOG_INFO, ['action' => 'save_notice']);
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        $content = substr(trim($data['content'] ?? ''), 0, 1000); // 限制长度
        safe_write($notice_file, json_encode([
            'enable'  => $data['enable']  ?? '0',
            'content' => $content,
            'mode'    => in_array($data['mode'] ?? '', ['always', 'daily']) ? $data['mode'] : 'daily',
            'delay'   => min(max(intval($data['delay'] ?? 1), 0), 30)
        ], JSON_UNESCAPED_UNICODE));
        echo json_encode(['code' => 1]);
        break;

    case 'get_cert':
        write_log_fast('front');
        $cert = json_decode(file_get_contents($cert_file), true);
        // 对输出进行XSS防护
        $cert['title'] = escape_html($cert['title'] ?? '');
        $cert['sub'] = escape_html($cert['sub'] ?? '');
        $cert['label'] = escape_html($cert['label'] ?? '');
        $cert['desc'] = escape_html($cert['desc'] ?? '');
        echo json_encode(['code' => 1, 'data' => $cert], JSON_UNESCAPED_UNICODE);
        break;

    case 'save_cert':
        write_log('admin', LOG_INFO, ['action' => 'save_cert']);
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        $existing = json_decode(file_get_contents($cert_file), true) ?? [];
        $templates = $data['templates'] ?? ($existing['templates'] ?? []);
        safe_write($cert_file, json_encode([
            'title' => substr(trim($data['title'] ?? ''), 0, 100),
            'sub'   => substr(trim($data['sub'] ?? ''), 0, 100),
            'label' => substr(trim($data['label'] ?? ''), 0, 100),
            'desc'  => substr(trim($data['desc'] ?? ''), 0, 500),
            'template' => in_array($data['template'] ?? '', ['classic','modern','elegant','luxury']) ? $data['template'] : ($existing['template'] ?? 'classic'),
            'templates' => $templates
        ], JSON_UNESCAPED_UNICODE));
        echo json_encode(['code' => 1]);
        break;

    case 'get_basic':
        write_log_fast('front');
        echo json_encode(['code' => 1, 'data' => json_decode(file_get_contents($basic_file), true)], JSON_UNESCAPED_UNICODE);
        break;

    case 'save_basic':
        write_log('admin', LOG_INFO, ['action' => 'save_basic']);
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        // 验证日期格式
        $year = $data['certYear'] ?? '';
        $month = $data['certMonth'] ?? '';
        $day = $data['certDay'] ?? '';
        
        if ($year && !preg_match('/^\d{4}$/', $year)) {
            echo json_encode(['code' => 0, 'msg' => '年份格式错误']);
            exit;
        }
        if ($month && !preg_match('/^(0[1-9]|1[0-2])$/', $month)) {
            echo json_encode(['code' => 0, 'msg' => '月份格式错误']);
            exit;
        }
        if ($day && !preg_match('/^(0[1-9]|[12]\d|3[01])$/', $day)) {
            echo json_encode(['code' => 0, 'msg' => '日期格式错误']);
            exit;
        }
        
        safe_write($basic_file, json_encode([
            'certYear'      => $year,
            'certMonth'     => $month,
            'certDay'       => $day,
            'certPrefix'    => substr(trim($data['certPrefix'] ?? 'FMO-'), 0, 20),
            'certNumYear'   => $data['certNumYear'] ?? '',
            'certNumMonth'  => $data['certNumMonth'] ?? '',
            'certNumDay'    => $data['certNumDay'] ?? ''
        ], JSON_UNESCAPED_UNICODE));
        echo json_encode(['code' => 1]);
        break;

    case 'get_log':
        write_log('admin', LOG_INFO, ['action' => 'view_logs']);
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        $logs = json_decode(file_get_contents($log_file), true) ?? [];
        // 对IP进行脱敏
        $logs = array_map(function($log) {
            $log['ip'] = mask_ip($log['ip'] ?? '');
            return $log;
        }, $logs);
        echo json_encode(['code' => 1, 'list' => $logs], JSON_UNESCAPED_UNICODE);
        break;

    case 'clear_log':
        write_log('admin', LOG_WARNING, ['action' => 'clear_logs']);
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        safe_write($log_file, json_encode([], JSON_UNESCAPED_UNICODE));
        echo json_encode(['code' => 1, 'msg' => '日志已清空']);
        break;

    case 'get_sstv':
        echo json_encode(['code' => 1, 'data' => json_decode(file_get_contents($sstv_file), true)], JSON_UNESCAPED_UNICODE);
        break;

    case 'save_sstv':
        write_log('admin', LOG_INFO, ['action' => 'save_sstv']);
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        safe_write($sstv_file, json_encode([
            'enable' => $data['enable'] ?? '0'
        ], JSON_UNESCAPED_UNICODE));
        echo json_encode(['code' => 1]);
        break;

    case 'get_sstv_history':
        $history = json_decode(file_get_contents($sstv_history_file), true) ?? [];
        echo json_encode(['code' => 1, 'list' => $history], JSON_UNESCAPED_UNICODE);
        break;

    case 'save_sstv_record':
        $history = json_decode(file_get_contents($sstv_history_file), true) ?? [];
        $record = [
            'id'        => uniqid(),
            'mode'      => substr(trim($data['mode'] ?? ''), 0, 50),
            'frequency' => substr(trim($data['frequency'] ?? ''), 0, 30),
            'callsign'  => strtoupper(substr(trim($data['callsign'] ?? ''), 0, 20)),
            'note'      => substr(trim($data['note'] ?? ''), 0, 200),
            'time'      => date('Y-m-d H:i:s')
        ];
        $history[] = $record;
        if (count($history) > 200) {
            $history = array_slice($history, -200);
        }
        safe_write($sstv_history_file, json_encode($history, JSON_UNESCAPED_UNICODE));
        echo json_encode(['code' => 1, 'data' => $record], JSON_UNESCAPED_UNICODE);
        break;

    case 'delete_sstv_record':
        $history = json_decode(file_get_contents($sstv_history_file), true) ?? [];
        $delId = $data['id'] ?? '';
        if (empty($delId) || !preg_match('/^[a-z0-9]+$/i', $delId)) {
            echo json_encode(['code' => 0, 'msg' => '无效的记录ID']);
            break;
        }
        $history = array_filter($history, function($item) use ($delId) {
            return $item['id'] !== $delId;
        });
        safe_write($sstv_history_file, json_encode(array_values($history), JSON_UNESCAPED_UNICODE));
        echo json_encode(['code' => 1]);
        break;

    case 'clear_sstv_history':
        write_log('admin', LOG_INFO, ['action' => 'clear_sstv']);
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        safe_write($sstv_history_file, json_encode([], JSON_UNESCAPED_UNICODE));
        echo json_encode(['code' => 1]);
        break;

    // ===================== 统计相关 API =====================

    case 'record_query':
        $stats = json_decode(file_get_contents($stats_file), true) ?? [
            'download_count' => 0,
            'query_count' => 0,
            'query_history' => [],
            'download_history' => []
        ];
        $stats['query_count'] = ($stats['query_count'] ?? 0) + 1;
        $callSign = strtoupper(trim($data['callsign'] ?? ''));
        if (!validate_callsign($callSign)) {
            echo json_encode(['code' => 0, 'msg' => '呼号格式错误']);
            break;
        }
        $ip = getRealIP();
        $entry = [
            'callsign' => $callSign,
            'ip'       => $ip,
            'time'     => date('Y-m-d H:i:s')
        ];
        $stats['query_history'][] = $entry;
        if (count($stats['query_history']) > 500) {
            $stats['query_history'] = array_slice($stats['query_history'], -500);
        }
        safe_write($stats_file, json_encode($stats, JSON_UNESCAPED_UNICODE));
        echo json_encode(['code' => 1, 'query_count' => $stats['query_count']]);
        trigger_webhook('query', $callSign);
        break;

    case 'record_download':
        $stats = json_decode(file_get_contents($stats_file), true) ?? [
            'download_count' => 0,
            'query_count' => 0,
            'query_history' => [],
            'download_history' => []
        ];
        $stats['download_count'] = ($stats['download_count'] ?? 0) + 1;
        $callSign = strtoupper(trim($data['callsign'] ?? ''));
        if (!validate_callsign($callSign)) {
            echo json_encode(['code' => 0, 'msg' => '呼号格式错误']);
            break;
        }
        $ip = getRealIP();
        $entry = [
            'callsign' => $callSign,
            'ip'       => $ip,
            'time'     => date('Y-m-d H:i:s')
        ];
        $stats['download_history'][] = $entry;
        if (count($stats['download_history']) > 500) {
            $stats['download_history'] = array_slice($stats['download_history'], -500);
        }
        safe_write($stats_file, json_encode($stats, JSON_UNESCAPED_UNICODE));
        echo json_encode(['code' => 1, 'download_count' => $stats['download_count']]);
        trigger_webhook('download', $callSign);
        break;

    case 'get_stats':
        write_log('admin', LOG_INFO, ['action' => 'view_stats']);
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        $stats = json_decode(file_get_contents($stats_file), true) ?? [
            'download_count' => 0,
            'query_count' => 0,
            'query_history' => [],
            'download_history' => []
        ];
        echo json_encode(['code' => 1, 'data' => $stats], JSON_UNESCAPED_UNICODE);
        break;

    case 'clear_stats':
        write_log('admin', LOG_WARNING, ['action' => 'clear_stats']);
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        safe_write($stats_file, json_encode([
            'download_count' => 0,
            'query_count' => 0,
            'query_history' => [],
            'download_history' => []
        ], JSON_UNESCAPED_UNICODE));
        echo json_encode(['code' => 1, 'msg' => '统计数据已清空']);
        break;

    case 'get_stats_public':
        $stats = json_decode(file_get_contents($stats_file), true) ?? [
            'download_count' => 0,
            'query_count' => 0
        ];
        echo json_encode([
            'code' => 1,
            'download_count' => $stats['download_count'] ?? 0,
            'query_count' => $stats['query_count'] ?? 0
        ]);
        break;

    // ===================== 功能1：证书在线验证 =====================

    case 'verify_cert':
        $features = json_decode(file_get_contents($features_file), true) ?? ['verify_enabled' => '1'];
        if (($features['verify_enabled'] ?? '1') !== '1') {
            echo json_encode(['code' => 0, 'msg' => '证书验证功能已关闭']);
            break;
        }
        $certNo = strtoupper(trim($data['cert_no'] ?? ''));
        if (empty($certNo)) {
            echo json_encode(['code' => 0, 'msg' => '请输入证书编号']);
            break;
        }
        if (!validate_cert_no($certNo)) {
            echo json_encode(['code' => 0, 'msg' => '证书编号格式无效']);
            break;
        }
        $lines = file($list_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        $basic = json_decode(file_get_contents($basic_file), true) ?? [];
        $prefix = $basic['certPrefix'] ?? 'FMO-';
        $ny = $basic['certNumYear'] ?? '';
        $nm = $basic['certNumMonth'] ?? '';
        $nd = $basic['certNumDay'] ?? '';
        $cy = $basic['certYear'] ?? '';
        $cm = $basic['certMonth'] ?? '';
        $cd = $basic['certDay'] ?? '';
        $now = new DateTime();
        if ($ny && $nm && $nd) {
            $dateStr = $ny . $nm . $nd;
            $displayDate = $ny . '年' . intval($nm) . '月' . intval($nd) . '日';
        } elseif ($cy && $cm && $cd) {
            $dateStr = $cy . $cm . $cd;
            $displayDate = $cy . '年' . intval($cm) . '月' . intval($cd) . '日';
        } else {
            $dateStr = $now->format('Ymd');
            $displayDate = $now->format('Y年n月j日');
        }
        $found = false;
        $foundCall = '';
        $foundIdx = 0;
        foreach ($lines as $idx => $line) {
            $call = strtoupper(trim($line));
            if (empty($call)) continue;
            $expectedNo = $prefix . $dateStr . str_pad($idx + 1, 2, '0', STR_PAD_LEFT);
            if (strtoupper($certNo) === strtoupper($expectedNo)) {
                $found = true;
                $foundCall = $call;
                $foundIdx = $idx + 1;
                break;
            }
        }
        if ($found) {
            write_log('verify', LOG_INFO, ['cert_no' => $certNo, 'result' => 'valid']);
            echo json_encode([
                'code' => 1,
                'msg' => '✅ 证书验证通过',
                'data' => [
                    'cert_no' => $certNo,
                    'callsign' => $foundCall,
                    'sequence' => $foundIdx,
                    'date' => $displayDate,
                    'status' => 'valid'
                ]
            ], JSON_UNESCAPED_UNICODE);
        } else {
            write_log('verify', LOG_WARNING, ['cert_no' => $certNo, 'result' => 'invalid']);
            echo json_encode([
                'code' => 0,
                'msg' => '❌ 证书编号无效，未在系统中找到匹配记录',
                'data' => ['cert_no' => $certNo, 'status' => 'invalid']
            ], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'record_verify':
        $stats = json_decode(file_get_contents($stats_file), true) ?? [
            'download_count' => 0, 'query_count' => 0,
            'query_history' => [], 'download_history' => []
        ];
        $stats['verify_count'] = ($stats['verify_count'] ?? 0) + 1;
        $stats['verify_history'] = $stats['verify_history'] ?? [];
        $callSign = strtoupper(trim($data['callsign'] ?? ''));
        $ip = getRealIP();
        $stats['verify_history'][] = [
            'cert_no'   => strtoupper(trim($data['cert_no'] ?? '')),
            'callsign'  => $callSign,
            'result'    => $data['result'] ?? '',
            'ip'        => $ip,
            'time'      => date('Y-m-d H:i:s')
        ];
        if (count($stats['verify_history']) > 500) {
            $stats['verify_history'] = array_slice($stats['verify_history'], -500);
        }
        safe_write($stats_file, json_encode($stats, JSON_UNESCAPED_UNICODE));
        echo json_encode(['code' => 1]);
        break;

    // ===================== 功能2：台站荣誉墙 =====================

    case 'get_honor_wall':
        $features = json_decode(file_get_contents($features_file), true) ?? ['honor_wall_enabled' => '1'];
        if (($features['honor_wall_enabled'] ?? '1') !== '1') {
            echo json_encode(['code' => 0, 'msg' => '荣誉墙功能已关闭']);
            break;
        }
        $lines = file($list_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        $totalCalls = count($lines);
        $stats = json_decode(file_get_contents($stats_file), true) ?? [];
        $queryHistory = $stats['query_history'] ?? [];
        $downloadHistory = $stats['download_history'] ?? [];
        $totalQuery = $stats['query_count'] ?? 0;
        $totalDownload = $stats['download_count'] ?? 0;
        $today = date('Y-m-d');
        $todayQuery = 0;
        foreach ($queryHistory as $q) {
            if (strpos($q['time'] ?? '', $today) === 0) $todayQuery++;
        }
        $todayDownload = 0;
        foreach ($downloadHistory as $d) {
            if (strpos($d['time'] ?? '', $today) === 0) $todayDownload++;
        }
        $queriedCalls = [];
        $seen = [];
        foreach (array_reverse($queryHistory) as $q) {
            $c = strtoupper($q['callsign'] ?? '');
            if (empty($c) || isset($seen[$c])) continue;
            $seen[$c] = true;
            $queriedCalls[] = $c;
            if (count($queriedCalls) >= 50) break;
        }
        echo json_encode([
            'code' => 1,
            'data' => [
                'total_calls'    => $totalCalls,
                'total_queries'  => $totalQuery,
                'total_downloads' => $totalDownload,
                'today_queries'  => $todayQuery,
                'today_downloads' => $todayDownload,
                'recent_calls'   => $queriedCalls
            ]
        ], JSON_UNESCAPED_UNICODE);
        break;

    // ===================== 功能3：趋势图表数据 =====================

    case 'get_stats_trend':
        write_log('admin', LOG_INFO, ['action' => 'view_trend']);
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        $stats = json_decode(file_get_contents($stats_file), true) ?? [];
        $queryHistory = $stats['query_history'] ?? [];
        $downloadHistory = $stats['download_history'] ?? [];
        $verifyHistory = $stats['verify_history'] ?? [];
        $days = min(intval($data['days'] ?? 7), 30);
        $trend = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-{$i} days"));
            $trend[$date] = ['query' => 0, 'download' => 0, 'verify' => 0];
        }
        foreach ($queryHistory as $q) {
            $d = substr($q['time'] ?? '', 0, 10);
            if (isset($trend[$d])) $trend[$d]['query']++;
        }
        foreach ($downloadHistory as $dl) {
            $d = substr($dl['time'] ?? '', 0, 10);
            if (isset($trend[$d])) $trend[$d]['download']++;
        }
        foreach ($verifyHistory as $vr) {
            $d = substr($vr['time'] ?? '', 0, 10);
            if (isset($trend[$d])) $trend[$d]['verify']++;
        }
        $result = [];
        foreach ($trend as $date => $counts) {
            $result[] = ['date' => $date, 'query' => $counts['query'], 'download' => $counts['download'], 'verify' => $counts['verify']];
        }
        echo json_encode(['code' => 1, 'data' => $result], JSON_UNESCAPED_UNICODE);
        break;

    // ===================== 功能开关管理 =====================

    case 'get_features':
        $features = json_decode(file_get_contents($features_file), true) ?? [
            'verify_enabled' => '1',
            'honor_wall_enabled' => '1',
            'chart_enabled' => '1',
            'share_enabled' => '1',
            'voice_enabled' => '0',
            'monthly_rank_enabled' => '1',
            'batch_export_enabled' => '1',
            'webhook_enabled' => '0',
            'webhook_url' => '',
            'webhook_type' => 'wechat',
            'dark_mode' => '0',
            'audio_card_enabled' => '1',
            'bigscreen_enabled' => '0',
            'ecard_enabled' => '1'
        ];
        echo json_encode(['code' => 1, 'data' => $features]);
        break;

    case 'save_features':
        write_log('admin', LOG_INFO, ['action' => 'save_features']);
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        // 验证webhook URL格式
        $webhookUrl = $data['webhook_url'] ?? '';
        if (!empty($webhookUrl) && !filter_var($webhookUrl, FILTER_VALIDATE_URL)) {
            echo json_encode(['code' => 0, 'msg' => 'Webhook URL格式无效']);
            exit;
        }
        
        safe_write($features_file, json_encode([
            'verify_enabled'      => $data['verify_enabled']      ?? '1',
            'honor_wall_enabled'  => $data['honor_wall_enabled']  ?? '1',
            'chart_enabled'       => $data['chart_enabled']       ?? '1',
            'share_enabled'       => $data['share_enabled']       ?? '1',
            'voice_enabled'       => $data['voice_enabled']       ?? '0',
            'monthly_rank_enabled'=> $data['monthly_rank_enabled']?? '1',
            'batch_export_enabled'=> $data['batch_export_enabled']?? '1',
            'webhook_enabled'     => $data['webhook_enabled']     ?? '0',
            'webhook_url'         => $webhookUrl,
            'webhook_type'        => in_array($data['webhook_type'] ?? '', ['wechat', 'dingtalk', 'feishu']) ? $data['webhook_type'] : 'wechat',
            'dark_mode'           => $data['dark_mode']           ?? '0',
            'audio_card_enabled'  => $data['audio_card_enabled']  ?? '1',
            'bigscreen_enabled'   => $data['bigscreen_enabled']   ?? '0',
            'ecard_enabled'       => $data['ecard_enabled']       ?? '1'
        ], JSON_UNESCAPED_UNICODE));
        echo json_encode(['code' => 1, 'msg' => '功能开关已保存']);
        break;

    // ===================== 功能4：证书分享链接 =====================

    case 'create_share':
        $features = json_decode(file_get_contents($features_file), true) ?? ['share_enabled' => '1'];
        if (($features['share_enabled'] ?? '1') !== '1') {
            echo json_encode(['code' => 0, 'msg' => '分享功能已关闭']);
            break;
        }
        $callsign = strtoupper(trim($data['callsign'] ?? ''));
        if (empty($callsign)) {
            echo json_encode(['code' => 0, 'msg' => '呼号不能为空']);
            break;
        }
        if (!validate_callsign($callsign)) {
            echo json_encode(['code' => 0, 'msg' => '呼号格式错误']);
            break;
        }
        $expires_in = intval($data['expires_in'] ?? 7);
        $token = bin2hex(random_bytes(16));
        $tokens = json_decode(file_get_contents($share_tokens_file), true) ?? [];
        $now = time();
        $tokens = array_filter($tokens, function($t) use ($now) {
            return $t['expires'] === 0 || $t['expires'] > $now;
        });
        $expires = $expires_in === 0 ? 0 : $now + ($expires_in * 86400);
        $tokens[$token] = [
            'callsign' => $callsign,
            'created'  => date('Y-m-d H:i:s'),
            'expires'  => $expires,
            'views'    => 0
        ];
        safe_write($share_tokens_file, json_encode($tokens, JSON_UNESCAPED_UNICODE));
        write_log('share', LOG_INFO, ['callsign' => $callsign, 'expires_in' => $expires_in]);
        echo json_encode(['code' => 1, 'token' => $token]);
        break;

    case 'get_share':
        $token = trim($data['token'] ?? $_GET['token'] ?? '');
        if (empty($token)) {
            echo json_encode(['code' => 0, 'msg' => '无效的分享链接']);
            break;
        }
        if (!preg_match('/^[a-f0-9]{32}$/i', $token)) {
            echo json_encode(['code' => 0, 'msg' => '分享链接格式无效']);
            break;
        }
        $tokens = json_decode(file_get_contents($share_tokens_file), true) ?? [];
        if (!isset($tokens[$token])) {
            echo json_encode(['code' => 0, 'msg' => '分享链接不存在']);
            break;
        }
        $share = $tokens[$token];
        if ($share['expires'] !== 0 && $share['expires'] < time()) {
            echo json_encode(['code' => 0, 'msg' => '分享链接已过期']);
            break;
        }
        $tokens[$token]['views'] = ($tokens[$token]['views'] ?? 0) + 1;
        safe_write($share_tokens_file, json_encode($tokens, JSON_UNESCAPED_UNICODE));
        echo json_encode(['code' => 1, 'callsign' => $share['callsign'], 'created' => $share['created']]);
        break;

    // ===================== 功能3：月度排行榜 =====================

    case 'get_monthly_rank':
        $features = json_decode(file_get_contents($features_file), true) ?? ['monthly_rank_enabled' => '1'];
        if (($features['monthly_rank_enabled'] ?? '1') !== '1') {
            echo json_encode(['code' => 0, 'msg' => '月度排行榜功能已关闭']);
            break;
        }
        $stats = json_decode(file_get_contents($stats_file), true) ?? [];
        $queryHistory = $stats['query_history'] ?? [];
        $downloadHistory = $stats['download_history'] ?? [];
        $month = $data['month'] ?? date('Y-m');
        if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
            echo json_encode(['code' => 0, 'msg' => '月份格式错误']);
            break;
        }
        $rank = [];
        foreach ($queryHistory as $q) {
            if (strpos($q['time'] ?? '', $month) === 0) {
                $c = strtoupper($q['callsign'] ?? '');
                if (!empty($c)) {
                    if (!isset($rank[$c])) $rank[$c] = ['queries' => 0, 'downloads' => 0];
                    $rank[$c]['queries']++;
                }
            }
        }
        foreach ($downloadHistory as $d) {
            if (strpos($d['time'] ?? '', $month) === 0) {
                $c = strtoupper($d['callsign'] ?? '');
                if (!empty($c)) {
                    if (!isset($rank[$c])) $rank[$c] = ['queries' => 0, 'downloads' => 0];
                    $rank[$c]['downloads']++;
                }
            }
        }
        uasort($rank, function($a, $b) {
            return ($b['queries'] + $b['downloads']) - ($a['queries'] + $a['downloads']);
        });
        $result = [];
        $i = 1;
        foreach ($rank as $call => $counts) {
            if ($i > 10) break;
            $result[] = [
                'rank' => $i,
                'callsign' => $call,
                'queries' => $counts['queries'],
                'downloads' => $counts['downloads'],
                'total' => $counts['queries'] + $counts['downloads']
            ];
            $i++;
        }
        echo json_encode(['code' => 1, 'month' => $month, 'data' => $result], JSON_UNESCAPED_UNICODE);
        break;

    // ===================== 功能5：Webhook推送 =====================

    case 'batch_export':
        write_log('admin', LOG_INFO, ['action' => 'batch_export']);
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        $features = json_decode(file_get_contents($features_file), true) ?? ['batch_export_enabled' => '1'];
        if (($features['batch_export_enabled'] ?? '1') !== '1') {
            echo json_encode(['code' => 0, 'msg' => '批量导出功能已关闭']);
            break;
        }
        $callsigns = $data['callsigns'] ?? [];
        if (empty($callsigns)) {
            echo json_encode(['code' => 0, 'msg' => '请选择要导出的呼号']);
            break;
        }
        // 验证呼号格式
        $valid_callsigns = array_filter(array_map(function($c) {
            $c = strtoupper(trim($c));
            return validate_callsign($c) ? $c : null;
        }, $callsigns));
        
        if (empty($valid_callsigns)) {
            echo json_encode(['code' => 0, 'msg' => '没有有效的呼号']);
            break;
        }
        
        $lines = file($list_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        $basic = json_decode(file_get_contents($basic_file), true) ?? [];
        $cert_data = json_decode(file_get_contents($cert_file), true) ?? [];
        $prefix = $basic['certPrefix'] ?? 'FMO-';
        $ny = $basic['certNumYear'] ?? '';
        $nm = $basic['certNumMonth'] ?? '';
        $nd = $basic['certNumDay'] ?? '';
        $cy = $basic['certYear'] ?? '';
        $cm = $basic['certMonth'] ?? '';
        $cd = $basic['certDay'] ?? '';
        $now = new DateTime();
        if ($ny && $nm && $nd) {
            $dateStr = $ny . $nm . $nd;
            $displayDate = $ny . '年' . intval($nm) . '月' . intval($nd) . '日';
        } elseif ($cy && $cm && $cd) {
            $dateStr = $cy . $cm . $cd;
            $displayDate = $cy . '年' . intval($cm) . '月' . intval($cd) . '日';
        } else {
            $dateStr = $now->format('Ymd');
            $displayDate = $now->format('Y年n月j日');
        }
        $results = [];
        foreach ($valid_callsigns as $call) {
            $idx = array_search($call, array_map('strtoupper', $lines));
            if ($idx !== false) {
                $no = $prefix . $dateStr . str_pad($idx + 1, 2, '0', STR_PAD_LEFT);
                $results[] = [
                    'callsign' => $call,
                    'cert_no' => $no,
                    'sequence' => $idx + 1,
                    'date' => $displayDate,
                    'title' => $cert_data['title'] ?? '点名参与证书',
                    'sub' => $cert_data['sub'] ?? '湖北FMO中继节点',
                    'label' => $cert_data['label'] ?? '兹证明',
                    'desc' => $cert_data['desc'] ?? ''
                ];
            }
        }
        echo json_encode(['code' => 1, 'data' => $results, 'count' => count($results)], JSON_UNESCAPED_UNICODE);
        break;

    // ===================== 数据备份/恢复 =====================

    case 'backup_data':
        write_log('admin', LOG_WARNING, ['action' => 'backup_data']);
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        $backup = [
            'version' => '2.0',
            'time' => date('Y-m-d H:i:s'),
            'pwd' => file_get_contents($pwd_file),
            'list' => file_get_contents($list_file),
            'status' => file_get_contents($status_file),
            'notice' => file_get_contents($notice_file),
            'cert' => file_get_contents($cert_file),
            'basic' => file_get_contents($basic_file),
            'features' => file_get_contents($features_file),
            'unlock' => file_get_contents($unlock_code_file),
            'sstv' => file_get_contents($sstv_file),
            'stats' => file_get_contents($stats_file),
            'log' => file_get_contents($log_file)
        ];
        $backup_json = json_encode($backup, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        $backup_file = 'backup_' . date('Ymd_His') . '.json';
        safe_write($backup_file, $backup_json);
        echo json_encode(['code' => 1, 'msg' => '备份已生成', 'file' => $backup_file, 'size' => strlen($backup_json)]);
        break;

    case 'list_backups':
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        $backups = [];
        foreach (glob('backup_*.json') as $f) {
            $backups[] = [
                'file' => $f,
                'size' => filesize($f),
                'time' => date('Y-m-d H:i:s', filemtime($f))
            ];
        }
        usort($backups, function($a, $b) { return strcmp($b['file'], $a['file']); });
        echo json_encode(['code' => 1, 'list' => $backups]);
        break;

    case 'restore_backup':
        write_log('admin', LOG_CRITICAL, ['action' => 'restore_backup']);
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        auto_backup('before_restore');
        $file = $data['file'] ?? '';
        if (empty($file) || !file_exists($file) || strpos($file, 'backup_') !== 0) {
            echo json_encode(['code' => 0, 'msg' => '备份文件不存在']);
            break;
        }
        // 验证文件名安全性
        if (!preg_match('/^backup_\d{8}_\d{6}\.json$/', $file)) {
            echo json_encode(['code' => 0, 'msg' => '备份文件名格式无效']);
            break;
        }
        $backup = json_decode(file_get_contents($file), true);
        if (!$backup) {
            echo json_encode(['code' => 0, 'msg' => '备份文件格式错误']);
            break;
        }
        if (isset($backup['pwd'])) safe_write($pwd_file, $backup['pwd']);
        if (isset($backup['list'])) safe_write($list_file, $backup['list']);
        if (isset($backup['status'])) safe_write($status_file, $backup['status']);
        if (isset($backup['notice'])) safe_write($notice_file, $backup['notice']);
        if (isset($backup['cert'])) safe_write($cert_file, $backup['cert']);
        if (isset($backup['basic'])) safe_write($basic_file, $backup['basic']);
        if (isset($backup['features'])) safe_write($features_file, $backup['features']);
        if (isset($backup['unlock'])) safe_write($unlock_code_file, $backup['unlock']);
        if (isset($backup['sstv'])) safe_write($sstv_file, $backup['sstv']);
        if (isset($backup['stats'])) safe_write($stats_file, $backup['stats']);
        if (isset($backup['log'])) safe_write($log_file, $backup['log']);
        echo json_encode(['code' => 1, 'msg' => '数据已恢复，备份时间：' . ($backup['time'] ?? '未知')]);
        break;

    case 'download_backup':
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        $file = $data['file'] ?? '';
        if (empty($file) || !file_exists($file) || strpos($file, 'backup_') !== 0) {
            echo json_encode(['code' => 0, 'msg' => '备份文件不存在']);
            break;
        }
        // 验证文件名安全性
        if (!preg_match('/^backup_\d{8}_\d{6}\.json$/', $file)) {
            echo json_encode(['code' => 0, 'msg' => '备份文件名格式无效']);
            break;
        }
        echo json_encode(['code' => 1, 'content' => file_get_contents($file)]);
        break;

    case 'search_suggest':
        $keyword = strtoupper(trim($data['keyword'] ?? $_GET['keyword'] ?? ''));
        $fuzzy = ($data['fuzzy'] ?? '0') === '1';
        if (strlen($keyword) < 1) {
            echo json_encode(['code' => 1, 'suggestions' => []]);
            break;
        }
        // 验证关键词格式
        if (!preg_match('/^[A-Z0-9\-]{1,20}$/i', $keyword)) {
            echo json_encode(['code' => 1, 'suggestions' => []]);
            break;
        }
        $lines = file($list_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        $matches = [];
        $contains_matches = [];
        foreach ($lines as $line) {
            $call = strtoupper(trim($line));
            if (strpos($call, $keyword) === 0) {
                $matches[] = $call;
                if (count($matches) >= 10) break;
            } elseif ($fuzzy && strpos($call, $keyword) !== false) {
                $contains_matches[] = $call;
            }
        }
        // 如果前缀匹配不足10个，补充中间匹配的结果
        if (count($matches) < 10 && !empty($contains_matches)) {
            $remaining = 10 - count($matches);
            $matches = array_merge($matches, array_slice($contains_matches, 0, $remaining));
        }
        echo json_encode(['code' => 1, 'suggestions' => $matches]);
        break;

    // ===================== 日志导出 =====================

    case 'export_log':
        write_log('admin', LOG_INFO, ['action' => 'export_log']);
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        $logs = json_decode(file_get_contents($log_file), true) ?? [];
        $type_filter = $data['type'] ?? '';
        if (!empty($type_filter)) {
            $logs = array_filter($logs, function($l) use ($type_filter) {
                return ($l['type'] ?? '') === $type_filter;
            });
        }
        // 生成CSV
        $csv = "时间,类型,级别,IP,归属地,操作\n";
        $level_names = ['DEBUG','INFO','WARNING','ERROR','CRITICAL'];
        foreach ($logs as $l) {
            $level_name = $level_names[$l['level'] ?? 1] ?? 'INFO';
            $csv .= '"'.($l['time'] ?? '').'","'.($l['type'] ?? '').'","'.$level_name.'","'.mask_ip($l['ip'] ?? '').'","'.($l['location'] ?? '').'","'.($l['action'] ?? '').'"'."\n";
        }
        echo json_encode(['code' => 1, 'csv' => $csv, 'count' => count($logs)]);
        break;

    // ===================== 呼号搜索（管理员用） =====================

    case 'search_callsign':
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        $keyword = strtoupper(trim($data['keyword'] ?? ''));
        $lines = file($list_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        if (empty($keyword)) {
            echo json_encode(['code' => 1, 'results' => array_map('strtoupper', $lines), 'total' => count($lines)]);
            break;
        }
        $results = [];
        foreach ($lines as $idx => $line) {
            $call = strtoupper(trim($line));
            if (strpos($call, $keyword) !== false) {
                $results[] = ['index' => $idx, 'callsign' => $call];
            }
        }
        echo json_encode(['code' => 1, 'results' => $results, 'total' => count($results)]);
        break;

    // ===================== 系统信息（公开） =====================

    case 'get_system_info':
        global $system_version, $system_version_name;
        $lines = file($list_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        $stats = json_decode(file_get_contents($stats_file), true) ?? [];
        echo json_encode([
            'code' => 1,
            'data' => [
                'version' => $system_version,
                'version_name' => $system_version_name,
                'total_callsigns' => count($lines),
                'total_queries' => $stats['query_count'] ?? 0,
                'total_downloads' => $stats['download_count'] ?? 0,
                'php_version' => PHP_VERSION,
                'server_time' => date('Y-m-d H:i:s')
            ]
        ]);
        break;

    case 'get_about':
        global $system_version, $system_version_name;
        echo json_encode([
            'code' => 1,
            'data' => [
                'version' => $system_version,
                'version_name' => $system_version_name,
                'name' => '湖北FMO中继·点名参与纪念证书查询系统',
                'name_en' => 'Hubei FMO Repeater Roll Call Certificate Query System',
                'developer' => 'BH6RGQ',
                'platform' => '湖北FMO中继台',
                'description' => '本系统为湖北FMO中继台例行点名活动参与者提供电子纪念证书的查询、下载、打印和分享服务。系统支持多模板证书、SSTV接收辅助、证书在线验证、月度排行榜、Webhook推送等功能。',
                'features' => [
                    '证书查询与下载（PNG图片）',
                    '证书直接打印',
                    '证书分享链接生成',
                    '多模板证书系统（4种预设模板+自定义颜色）',
                    '证书在线验证',
                    'SSTV接收辅助工具',
                    '月度活跃排行榜',
                    '台站荣誉墙',
                    '趋势数据图表',
                    '批量证书导出',
                    '语音播报',
                    'Webhook推送（企业微信/钉钉/飞书）',
                    '数据备份与恢复',
                    '深色模式',
                    '日志导出（CSV）',
                    '模糊搜索与搜索历史'
                ],
                'tech_stack' => [
                    '前端：原生HTML5 + CSS3 + JavaScript（无框架依赖）',
                    '后端：PHP 7.4+（纯PHP，无第三方框架）',
                    '存储：JSON文件存储（轻量级，无需数据库）',
                    '图表：Canvas 2D 原生绘制',
                    '证书生成：html2canvas',
                    '二维码：qrcode-generator'
                ],
                'changelog' => [
                    ['version' => '2.8.3', 'date' => '2026-05-05', 'note' => '移动端优化版：全面优化手机端页面显示、Header/卡片/按钮/SSTV/证书/表单等响应式适配'],
                    ['version' => '2.8.2', 'date' => '2026-05-05', 'note' => '稳定性优化版：修复页面刷新总点名人数跳0、修复快速刷新加载失败、消除并发文件锁竞争、IP归属地缓存机制、Promise.all容错改造、sessionStorage名单缓存'],
                    ['version' => '2.8.1', 'date' => '2026-05-04', 'note' => 'Bug修复版：修复查询开关刷新自动关闭、SSTV/活动通知接口网络错误、管理后台内容隐藏、操作日志显示异常、关于系统加载失败'],
                    ['version' => '2.8.0', 'date' => '2026-05-04', 'note' => '管理后台独立版：管理后台独立页面、活动通知悬浮气泡、主页面与设置分离'],
                    ['version' => '2.7.0', 'date' => '2026-05-04', 'note' => '活动通知版：新增活动通知发布页面、音频贺卡重新设计为无线电频谱风格、版本号管理优化'],
                    ['version' => '2.6.0', 'date' => '2026-05-04', 'note' => '三新功能版：新增音频贺卡（语音合成+Google TTS降级）、电子名片（3种风格）、实时在线大屏（弹幕+TOP5+地区分布）、浏览器缓存版本号控制、移动端语音兼容'],
                    ['version' => '2.5.0', 'date' => '2026-05-04', 'note' => '全面优化版：安全加固、模糊搜索、搜索历史、打印证书、日志导出CSV、多模板证书系统、键盘快捷键、无障碍优化、打印样式、深色模式增强'],
                    ['version' => '2.0.0', 'date' => '2026-04-01', 'note' => '新增SSTV辅助工具、证书验证、荣誉墙、月度排行、Webhook推送、批量导出、趋势图表'],
                    ['version' => '1.0.0', 'date' => '2026-01-01', 'note' => '初始版本：证书查询、下载、分享、后台管理']
                ],
                'license' => '公益服务平台，仅供湖北FMO中继台使用',
                'copyright' => '© 2026 湖北FMO中继台'
            ]
        ], JSON_UNESCAPED_UNICODE);
        break;

    // ===================== 大屏数据（公开） =====================

    case 'get_bigscreen':
        $features = json_decode(file_get_contents($features_file), true) ?? ['bigscreen_enabled' => '0'];
        if (($features['bigscreen_enabled'] ?? '0') !== '1') {
            echo json_encode(['code' => 0, 'msg' => '大屏模式未开启']);
            break;
        }
        $lines = file($list_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        $stats = json_decode(file_get_contents($stats_file), true) ?? [];
        $queryHistory = $stats['query_history'] ?? [];
        $downloadHistory = $stats['download_history'] ?? [];
        $today = date('Y-m-d');
        // 今日查询
        $todayQueries = array_filter($queryHistory, function($q) use ($today) {
            return strpos($q['time'] ?? '', $today) === 0;
        });
        // 今日下载
        $todayDownloads = array_filter($downloadHistory, function($d) use ($today) {
            return strpos($d['time'] ?? '', $today) === 0;
        });
        // 最近10条查询（用于弹幕滚动）
        $recentQueries = array_slice(array_reverse($queryHistory), 0, 10);
        // 城市分布统计
        $cities = [];
        foreach ($queryHistory as $q) {
            $ip = $q['ip'] ?? '';
            if (!empty($ip)) {
                $loc = getIPLocation($ip);
                if ($loc !== '内网IP' && $loc !== '查询失败') {
                    $city = mb_substr($loc, 0, mb_strpos($loc, ' ') ?: mb_strlen($loc));
                    if (!isset($cities[$city])) $cities[$city] = 0;
                    $cities[$city]++;
                }
            }
        }
        arsort($cities);
        $topCities = array_slice($cities, 0, 10, true);
        // 今日TOP5台站
        $todayRank = [];
        foreach ($todayQueries as $q) {
            $c = strtoupper($q['callsign'] ?? '');
            if (!empty($c)) {
                if (!isset($todayRank[$c])) $todayRank[$c] = 0;
                $todayRank[$c]++;
            }
        }
        arsort($todayRank);
        $topStations = [];
        $i = 1;
        foreach ($todayRank as $call => $cnt) {
            if ($i > 5) break;
            $topStations[] = ['callsign' => $call, 'count' => $cnt];
            $i++;
        }
        // 台站首次参与日期
        $firstSeen = [];
        foreach (array_reverse($queryHistory) as $q) {
            $c = strtoupper($q['callsign'] ?? '');
            if (!empty($c) && !isset($firstSeen[$c])) {
                $firstSeen[$c] = substr($q['time'] ?? '', 0, 10);
            }
        }
        echo json_encode([
            'code' => 1,
            'data' => [
                'total_calls'     => count($lines),
                'total_queries'   => $stats['query_count'] ?? 0,
                'total_downloads' => $stats['download_count'] ?? 0,
                'today_queries'   => count($todayQueries),
                'today_downloads' => count($todayDownloads),
                'recent_queries'  => array_map(function($q) {
                    return ['callsign' => strtoupper($q['callsign'] ?? ''), 'time' => $q['time'] ?? ''];
                }, $recentQueries),
                'top_stations'    => $topStations,
                'top_cities'      => $topCities,
                'first_seen'      => $firstSeen,
                'server_time'     => date('Y-m-d H:i:s')
            ]
        ], JSON_UNESCAPED_UNICODE);
        break;

    // ===================== 电子名片数据 =====================

    case 'get_ecard':
        $features = json_decode(file_get_contents($features_file), true) ?? ['ecard_enabled' => '1'];
        if (($features['ecard_enabled'] ?? '1') !== '1') {
            echo json_encode(['code' => 0, 'msg' => '电子名片功能已关闭']);
            break;
        }
        $callsign = strtoupper(trim($data['callsign'] ?? ''));
        if (empty($callsign)) {
            echo json_encode(['code' => 0, 'msg' => '呼号不能为空']);
            break;
        }
        if (!validate_callsign($callsign)) {
            echo json_encode(['code' => 0, 'msg' => '呼号格式错误']);
            break;
        }
        $lines = file($list_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        $lines = array_map('strtoupper', $lines);
        $idx = array_search($callsign, $lines);
        if ($idx === false) {
            echo json_encode(['code' => 0, 'msg' => '未找到该呼号']);
            break;
        }
        $stats = json_decode(file_get_contents($stats_file), true) ?? [];
        $queryHistory = $stats['query_history'] ?? [];
        $downloadHistory = $stats['download_history'] ?? [];
        // 统计该呼号
        $queryCount = 0;
        $downloadCount = 0;
        $firstDate = '';
        foreach ($queryHistory as $q) {
            if (strtoupper($q['callsign'] ?? '') === $callsign) {
                $queryCount++;
                if (empty($firstDate)) $firstDate = substr($q['time'] ?? '', 0, 10);
            }
        }
        foreach (array_reverse($queryHistory) as $q) {
            if (strtoupper($q['callsign'] ?? '') === $callsign) {
                $firstDate = substr($q['time'] ?? '', 0, 10);
            }
        }
        foreach ($downloadHistory as $d) {
            if (strtoupper($d['callsign'] ?? '') === $callsign) $downloadCount++;
        }
        // 证书编号
        $basic = json_decode(file_get_contents($basic_file), true) ?? [];
        $cert_data = json_decode(file_get_contents($cert_file), true) ?? [];
        $prefix = $basic['certPrefix'] ?? 'FMO-';
        $ny = $basic['certNumYear'] ?? '';
        $nm = $basic['certNumMonth'] ?? '';
        $nd = $basic['certNumDay'] ?? '';
        $cy = $basic['certYear'] ?? '';
        $cm = $basic['certMonth'] ?? '';
        $cd = $basic['certDay'] ?? '';
        $now = new DateTime();
        if ($ny && $nm && $nd) {
            $dateStr = $ny . $nm . $nd;
            $displayDate = $ny . '年' . intval($nm) . '月' . intval($nd) . '日';
        } elseif ($cy && $cm && $cd) {
            $dateStr = $cy . $cm . $cd;
            $displayDate = $cy . '年' . intval($cm) . '月' . intval($cd) . '日';
        } else {
            $dateStr = $now->format('Ymd');
            $displayDate = $now->format('Y年n月j日');
        }
        $certNo = $prefix . $dateStr . str_pad($idx + 1, 2, '0', STR_PAD_LEFT);
        // 模板颜色
        $template = $cert_data['template'] ?? 'classic';
        $templates = $cert_data['templates'] ?? [];
        $tplColors = $templates[$template] ?? ['borderColor' => '#8b0000', 'titleColor' => '#8b0000', 'signColor' => '#1a1a6c'];
        echo json_encode([
            'code' => 1,
            'data' => [
                'callsign'      => $callsign,
                'sequence'      => $idx + 1,
                'cert_no'       => $certNo,
                'cert_date'     => $displayDate,
                'first_date'    => $firstDate ?: $displayDate,
                'query_count'   => $queryCount,
                'download_count'=> $downloadCount,
                'total_stations'=> count($lines),
                'template'      => $template,
                'colors'        => $tplColors,
                'cert_title'    => $cert_data['title'] ?? '点名参与证书',
                'cert_sub'      => $cert_data['sub'] ?? '湖北FMO中继节点'
            ]
        ], JSON_UNESCAPED_UNICODE);
        break;

    // ===================== 活动通知管理 =====================

    case 'get_activity':
        $activity = json_decode(file_get_contents($activity_file), true) ?? [
            'enabled' => '0', 'title' => '', 'content' => '', 'date' => '',
            'time' => '', 'frequency' => '', 'location' => '', 'notes' => '', 'updated' => ''
        ];
        echo json_encode(['code' => 1, 'data' => $activity], JSON_UNESCAPED_UNICODE);
        break;

    case 'save_activity':
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        $title = substr(trim($data['title'] ?? ''), 0, 200);
        $content = substr(trim($data['content'] ?? ''), 0, 2000);
        $date = substr(trim($data['date'] ?? ''), 0, 20);
        $time = substr(trim($data['time'] ?? ''), 0, 50);
        $frequency = substr(trim($data['frequency'] ?? ''), 0, 100);
        $location = substr(trim($data['location'] ?? ''), 0, 200);
        $notes = substr(trim($data['notes'] ?? ''), 0, 1000);
        $enabled = ($data['enabled'] ?? '0') === '1' ? '1' : '0';
        safe_write($activity_file, json_encode([
            'enabled' => $enabled,
            'title' => $title,
            'content' => $content,
            'date' => $date,
            'time' => $time,
            'frequency' => $frequency,
            'location' => $location,
            'notes' => $notes,
            'updated' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE));
        write_log('admin', LOG_INFO, ['action' => 'save_activity']);
        echo json_encode(['code' => 1, 'msg' => '活动通知已保存']);
        break;

    case 'test_webhook':
        write_log('admin', LOG_INFO, ['action' => 'test_webhook']);
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        $features = json_decode(file_get_contents($features_file), true) ?? [];
        $webhook_url = $features['webhook_url'] ?? '';
        $webhook_type = $features['webhook_type'] ?? 'wechat';
        if (empty($webhook_url)) {
            echo json_encode(['code' => 0, 'msg' => '请先配置Webhook URL']);
            break;
        }
        $test_msg = "🔔 FMO证书系统测试通知\n时间：" . date('Y-m-d H:i:s') . "\n状态：Webhook配置成功！";
        $result = send_webhook($webhook_url, $webhook_type, $test_msg);
        echo json_encode(['code' => $result ? 1 : 0, 'msg' => $result ? '测试消息已发送' : '发送失败，请检查URL']);
        break;

    // ===================== 系统健康检查 =====================

    case 'get_health':
        write_log('admin', LOG_INFO, ['action' => 'health_check']);
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        
        $health = [];
        
        // PHP版本
        $health['php_version'] = PHP_VERSION;
        
        // 磁盘空间
        $health['disk_free'] = round(disk_free_space('.') / (1024*1024*1024), 2) . ' GB';
        $health['disk_total'] = round(disk_total_space('.') / (1024*1024*1024), 2) . ' GB';
        
        // 文件权限
        $files = [$pwd_file, $list_file, $status_file, $notice_file, $cert_file, $basic_file, $stats_file, $features_file];
        $health['file_permissions'] = [];
        foreach ($files as $f) {
            $health['file_permissions'][$f] = [
                'exists' => file_exists($f),
                'readable' => is_readable($f),
                'writable' => is_writable($f)
            ];
        }
        
        // 数据文件大小
        $data_files = glob('*.json');
        $total_size = 0;
        foreach ($data_files as $f) {
            $total_size += filesize($f);
        }
        $health['data_size'] = round($total_size / 1024, 2) . ' KB';
        
        // 服务器信息
        $health['server_software'] = $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown';
        $health['server_time'] = date('Y-m-d H:i:s');
        
        echo json_encode(['code' => 1, 'data' => $health]);
        break;

    // ===================== CSRF Token管理 =====================

    case 'get_csrf_token':
        $token = bin2hex(random_bytes(32));
        $tokens = json_decode(file_get_contents($csrf_token_file), true) ?? [];
        $now = time();
        // 清理过期token
        $tokens = array_filter($tokens, function($t) use ($now) {
            return $t['expires'] > $now;
        });
        $tokens[$token] = [
            'ip' => getRealIP(),
            'expires' => $now + 3600, // 1小时有效
            'used' => false
        ];
        safe_write($csrf_token_file, json_encode($tokens));
        echo json_encode(['code' => 1, 'token' => $token]);
        break;

    // ===================== 意见反馈 =====================

    case 'submit_feedback':
        $content = substr(trim($data['content'] ?? ''), 0, 2000);
        if (empty($content)) {
            echo json_encode(['code' => 0, 'msg' => '请输入反馈内容']);
            break;
        }
        $contact = substr(trim($data['contact'] ?? ''), 0, 100);
        $type = in_array($data['type'] ?? '', ['suggestion', 'bug', 'praise', 'other']) ? $data['type'] : 'other';
        $ip = getRealIP();
        $feedback = json_decode(file_get_contents($feedback_file), true) ?? [];
        $feedback[] = [
            'id'       => uniqid(),
            'type'     => $type,
            'content'  => $content,
            'contact'  => $contact,
            'ip'       => mask_ip($ip),
            'time'     => date('Y-m-d H:i:s'),
            'read'     => false
        ];
        if (count($feedback) > 500) {
            $feedback = array_slice($feedback, -500);
        }
        safe_write($feedback_file, json_encode($feedback, JSON_UNESCAPED_UNICODE));
        echo json_encode(['code' => 1, 'msg' => '感谢您的反馈！我们会认真对待每一条意见']);
        break;

    case 'get_feedback':
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        $feedback = json_decode(file_get_contents($feedback_file), true) ?? [];
        echo json_encode(['code' => 1, 'list' => array_reverse($feedback)], JSON_UNESCAPED_UNICODE);
        break;

    case 'mark_feedback_read':
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        $id = $data['id'] ?? '';
        $feedback = json_decode(file_get_contents($feedback_file), true) ?? [];
        foreach ($feedback as &$f) {
            if ($f['id'] === $id) { $f['read'] = true; break; }
        }
        unset($f);
        safe_write($feedback_file, json_encode($feedback, JSON_UNESCAPED_UNICODE));
        echo json_encode(['code' => 1]);
        break;

    case 'delete_feedback':
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        $id = $data['id'] ?? '';
        $feedback = json_decode(file_get_contents($feedback_file), true) ?? [];
        $feedback = array_values(array_filter($feedback, function($f) use ($id) {
            return $f['id'] !== $id;
        }));
        safe_write($feedback_file, json_encode($feedback, JSON_UNESCAPED_UNICODE));
        echo json_encode(['code' => 1]);
        break;

    case 'clear_feedback':
        if (!check_auth($data)) {
            echo json_encode(['code' => 0, 'msg' => '认证失败，请重新登录']);
            exit;
        }
        safe_write($feedback_file, json_encode([], JSON_UNESCAPED_UNICODE));
        echo json_encode(['code' => 1]);
        break;

    default:
        write_log('api', LOG_WARNING, ['action' => $action, 'reason' => 'invalid_action']);
        echo json_encode(['code' => 0, 'msg' => '无效action']);
}
?>
