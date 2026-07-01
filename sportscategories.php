<?php
// sportscategories.php - PHP Backend API for Sports Categories Management

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Database configuration
$host = 'localhost';
$dbname = 'cam';
$username = 'root';
$password = '';

function sendResponse($success, $message, $data = null) {
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get input data
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $_GET['action'] ?? $input['action'] ?? '';

    // GET - Fetch all sport categories
    if ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'get') {
        $stmt = $pdo->prepare("
            SELECT 
                sc.*,
                u1.user_name as created_by_name,
                u2.user_name as modified_by_name
            FROM sportscategories sc
            LEFT JOIN users u1 ON sc.CreatedBy = u1.user_id
            LEFT JOIN users u2 ON sc.ModifiedBy = u2.user_id
            ORDER BY sc.CategoryName ASC
        ");
        $stmt->execute();
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendResponse(true, 'Sports categories fetched successfully', $categories);
    }
    
    // GET single category
    elseif ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'get_one' && isset($_GET['id'])) {
        $stmt = $pdo->prepare("
            SELECT sc.*, u1.user_name as created_by_name
            FROM sportscategories sc
            LEFT JOIN users u1 ON sc.CreatedBy = u1.user_id
            WHERE sc.SportCategoryID = ?
        ");
        $stmt->execute([$_GET['id']]);
        $category = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($category) {
            sendResponse(true, 'Category fetched successfully', $category);
        } else {
            sendResponse(false, 'Category not found');
        }
    }
    
    // POST - Add new sport category
    elseif ($_SERVER['REQUEST_METHOD'] == 'POST' && $action == 'add') {
        // Validate required fields
        if (empty($input['CategoryName'])) {
            sendResponse(false, 'Category name is required');
        }
        
        // Check if category already exists
        $check_stmt = $pdo->prepare("SELECT SportCategoryID FROM sportscategories WHERE CategoryName = ?");
        $check_stmt->execute([$input['CategoryName']]);
        if ($check_stmt->fetch()) {
            sendResponse(false, 'Category name already exists');
        }
        
        // Insert new category
        $stmt = $pdo->prepare("
            INSERT INTO sportscategories (CategoryName, Description, SportType, Gender, CreatedBy) 
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $input['CategoryName'],
            $input['Description'] ?? null,
            $input['SportType'] ?? 'Team',
            $input['Gender'] ?? 'Any',
            $input['CreatedBy'] ?? null
        ]);
        
        $last_id = $pdo->lastInsertId();
        sendResponse(true, 'Sports category added successfully', ['SportCategoryID' => $last_id]);
    }
    
    // POST - Update sport category
    elseif (($_SERVER['REQUEST_METHOD'] == 'PUT' || $_SERVER['REQUEST_METHOD'] == 'POST') && $action == 'update') {
        if (empty($input['SportCategoryID'])) {
            sendResponse(false, 'SportCategoryID is required for update');
        }
        
        // Check if category exists
        $check_stmt = $pdo->prepare("SELECT SportCategoryID FROM sportscategories WHERE SportCategoryID = ?");
        $check_stmt->execute([$input['SportCategoryID']]);
        if (!$check_stmt->fetch()) {
            sendResponse(false, 'Category not found');
        }
        
        // Check if category name already exists (excluding current)
        if (isset($input['CategoryName'])) {
            $check_stmt = $pdo->prepare("SELECT SportCategoryID FROM sportscategories WHERE CategoryName = ? AND SportCategoryID != ?");
            $check_stmt->execute([$input['CategoryName'], $input['SportCategoryID']]);
            if ($check_stmt->fetch()) {
                sendResponse(false, 'Category name already exists for another category');
            }
        }
        
        $stmt = $pdo->prepare("
            UPDATE sportscategories 
            SET CategoryName = ?, 
                Description = ?, 
                SportType = ?, 
                Gender = ?, 
                ModifiedBy = ?,
                ModifiedOn = NOW()
            WHERE SportCategoryID = ?
        ");
        $stmt->execute([
            $input['CategoryName'],
            $input['Description'] ?? null,
            $input['SportType'] ?? 'Team',
            $input['Gender'] ?? 'Any',
            $input['ModifiedBy'] ?? null,
            $input['SportCategoryID']
        ]);
        
        sendResponse(true, 'Sports category updated successfully');
    }
    
    // POST - Delete sport category
    elseif (($_SERVER['REQUEST_METHOD'] == 'DELETE' || $_SERVER['REQUEST_METHOD'] == 'POST') && $action == 'delete') {
        if (empty($input['SportCategoryID'])) {
            sendResponse(false, 'SportCategoryID is required for deletion');
        }
        
        // Check if category is being used by any sports team
        $check_teams = $pdo->prepare("SELECT TeamID FROM sportsteams WHERE SportCategoryID = ? LIMIT 1");
        $check_teams->execute([$input['SportCategoryID']]);
        if ($check_teams->fetch()) {
            sendResponse(false, 'Cannot delete category because it is being used by one or more sports teams');
        }
        
        $stmt = $pdo->prepare("DELETE FROM sportscategories WHERE SportCategoryID = ?");
        $stmt->execute([$input['SportCategoryID']]);
        
        sendResponse(true, 'Sports category deleted successfully');
    }
    
    else {
        sendResponse(false, 'Invalid action or method');
    }
    
} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    sendResponse(false, 'Database error: ' . $e->getMessage());
} catch (Exception $e) {
    error_log("General error: " . $e->getMessage());
    sendResponse(false, 'Server error: ' . $e->getMessage());
}
?>