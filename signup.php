<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

$host = 'localhost';
$dbname = 'cam';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Debug: Log received data
    error_log("Signup data: " . print_r($data, true));
    
    // Check if email exists
    $check = $pdo->prepare("SELECT user_id FROM users WHERE email = ?");
    $check->execute([$data['email']]);
    if ($check->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Email already exists']);
        exit;
    }
    
    // Insert into users table - INCLUDING user_type
    $hashed = password_hash($data['password'], PASSWORD_DEFAULT);
    $insert = $pdo->prepare("INSERT INTO users (user_name, email, password, phone, user_type, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
    $insert->execute([
        $data['name'], 
        $data['email'], 
        $hashed, 
        $data['phone'] ?? null, 
        $data['user_type']  // This will be 'Student', 'ClubLeader', or 'Admin'
    ]);
    $userId = $pdo->lastInsertId();
    
    // Insert into userprofiles table (if needed)
    $profile = $pdo->prepare("INSERT INTO userprofiles (user_id, gender, date_of_birth, contact, address, profile_picture) VALUES (?, ?, ?, ?, ?, ?)");
    $profile->execute([
        $userId,
        $data['gender'] ?? null,
        $data['date_of_birth'] ?? null,
        $data['contact'] ?? null,
        $data['address'] ?? null,
        $data['profile_picture'] ?? null
    ]);
    
    // Insert into specific role tables based on user_type
    if ($data['user_type'] == 'Student') {
        $student = $pdo->prepare("INSERT INTO students (user_id, student_number, faculty, year_of_study) VALUES (?, ?, ?, ?)");
        $student->execute([
            $userId, 
            $data['student_number'] ?? null, 
            $data['faculty'] ?? null, 
            $data['year_of_study'] ?? null
        ]);
    }
    
    // FIXED: Changed from 'Teacher' to 'ClubLeader'
    if ($data['user_type'] == 'ClubLeader') {
        // Check if club_leaders table exists, if not create it
        try {
            $checkTable = $pdo->query("SHOW TABLES LIKE 'club_leaders'");
            if ($checkTable->rowCount() == 0) {
                // Create club_leaders table
                $pdo->exec("
                    CREATE TABLE IF NOT EXISTS club_leaders (
                        leader_id INT PRIMARY KEY AUTO_INCREMENT,
                        user_id INT NOT NULL,
                        club_id INT NULL,
                        position VARCHAR(50) DEFAULT 'Leader',
                        assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                        FOREIGN KEY (club_id) REFERENCES clubs(club_id) ON DELETE SET NULL
                    )
                ");
            }
            
            $clubLeader = $pdo->prepare("INSERT INTO club_leaders (user_id, position) VALUES (?, ?)");
            $clubLeader->execute([$userId, $data['position'] ?? 'Club Leader']);
        } catch (PDOException $e) {
            error_log("ClubLeader table error: " . $e->getMessage());
            // Continue anyway - user was created
        }
    }
    
    // Also handle Admin if needed
    if ($data['user_type'] == 'Admin') {
        $admin = $pdo->prepare("INSERT INTO admins (user_id, admin_level) VALUES (?, ?)");
        $admin->execute([$userId, $data['admin_level'] ?? 'Standard']);
    }
    
    echo json_encode([
        'success' => true, 
        'message' => 'Account created successfully as ' . $data['user_type'],
        'user_type' => $data['user_type']
    ]);
    
} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>