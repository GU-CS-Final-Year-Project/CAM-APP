<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

$host = 'localhost';
$dbname = 'cam';
$username = 'root';
$password = '';

function sendResponse($success, $message, $data = null) {
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit;
}

function sendPushNotification($token, $title, $body) {
    if (empty($token)) return false;
    
    $payload = json_encode([
        'to' => $token,
        'title' => $title,
        'body' => $body,
        'sound' => 'default',
    ]);
    
    $ch = curl_init('https://exp.host/--/api/v2/push/send');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json',
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return $httpCode === 200;
}

function getPushRecipients($pdo, $targetAudience, $clubId = null) {
    if ($targetAudience === 'All') {
        $stmt = $pdo->query("SELECT user_id, push_token, user_name FROM users WHERE push_token IS NOT NULL AND push_token != ''");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } elseif ($targetAudience === 'Students') {
        $stmt = $pdo->prepare("SELECT user_id, push_token, user_name FROM users WHERE user_type = 'Student' AND push_token IS NOT NULL AND push_token != ''");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } elseif ($targetAudience === 'ClubLeader') {
        $stmt = $pdo->prepare("SELECT user_id, push_token, user_name FROM users WHERE user_type = 'ClubLeader' AND push_token IS NOT NULL AND push_token != ''");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } elseif ($targetAudience === 'Admins') {
        $stmt = $pdo->prepare("SELECT user_id, push_token, user_name FROM users WHERE user_type = 'Admin' AND push_token IS NOT NULL AND push_token != ''");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } elseif ($targetAudience === 'Clubs' && $clubId) {
        $stmt = $pdo->prepare("
            SELECT DISTINCT u.user_id, u.push_token, u.user_name
            FROM club_members cm
            JOIN users u ON cm.student_id = u.user_id
            WHERE cm.club_id = ? AND u.push_token IS NOT NULL AND u.push_token != ''
        ");
        $stmt->execute([$clubId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    return [];
}

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$phpmailerFound = false;
$pmException = __DIR__ . '/Exception.php';
$pmPHPMailer = __DIR__ . '/PHPMailer.php';
$pmSMTP = __DIR__ . '/SMTP.php';

if (file_exists($pmException) && file_exists($pmPHPMailer) && file_exists($pmSMTP)) {
    require $pmException;
    require $pmPHPMailer;
    require $pmSMTP;
    $phpmailerFound = true;
}

function sendEmail($to, $subject, $body) {
    global $phpmailerFound;
    if (!$phpmailerFound) {
        return 'PHPMailer not installed';
    }

    try {
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'lokuacatherine@gmail.com';
        $mail->Password   = 'rhrn makk slna lelv';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        $mail->setFrom('lokuacatherine@gmail.com', 'CAMS Notifications');
        $mail->addAddress($to);

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $body;

        $mail->send();
        return true;
    } catch (Exception $e) {
        return $e->getMessage();
    }
}

function getRecipients($pdo, $targetAudience, $clubId = null) {
    $recipients = [];

    if ($targetAudience === 'All') {
        $stmt = $pdo->query("SELECT email, user_name FROM users WHERE email IS NOT NULL AND email != ''");
        $recipients = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } elseif ($targetAudience === 'Students') {
        $stmt = $pdo->prepare("SELECT email, user_name FROM users WHERE user_type = 'Student' AND email IS NOT NULL AND email != ''");
        $stmt->execute();
        $recipients = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } elseif ($targetAudience === 'ClubLeader') {
        $stmt = $pdo->prepare("SELECT email, user_name FROM users WHERE user_type = 'ClubLeader' AND email IS NOT NULL AND email != ''");
        $stmt->execute();
        $recipients = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } elseif ($targetAudience === 'Admins') {
        $stmt = $pdo->prepare("SELECT email, user_name FROM users WHERE user_type = 'Admin' AND email IS NOT NULL AND email != ''");
        $stmt->execute();
        $recipients = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } elseif ($targetAudience === 'Clubs' && $clubId) {
        $stmt = $pdo->prepare("
            SELECT DISTINCT u.email, u.user_name
            FROM club_members cm
            JOIN users u ON cm.student_id = u.user_id
            WHERE cm.club_id = ? AND u.email IS NOT NULL AND u.email != ''
        ");
        $stmt->execute([$clubId]);
        $recipients = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    return $recipients;
}

function applyAudienceFilter(&$where, &$params, $user_type) {
    if ($user_type === 'Student') {
        $where[] = "(TargetAudience = 'All' OR TargetAudience = 'Students')";
    } elseif ($user_type === 'ClubLeader') {
        $where[] = "(TargetAudience = 'All' OR TargetAudience = 'ClubLeader')";
    } elseif ($user_type === 'Admin') {
        return;
    }
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $_GET['action'] ?? $input['action'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'];
    $user_type = $_GET['user_type'] ?? '';

    // GET - List all announcements
    if ($method == 'GET' && $action == 'get') {
        $where = [];
        $params = [];
        applyAudienceFilter($where, $params, $user_type);
        $whereClause = count($where) > 0 ? 'WHERE ' . implode(' AND ', $where) : '';

        $stmt = $pdo->prepare("
            SELECT a.*,
                u1.user_name AS created_by_name,
                u2.user_name AS modified_by_name
            FROM announcements a
            LEFT JOIN users u1 ON a.CreatedBy = u1.user_id
            LEFT JOIN users u2 ON a.ModifiedBy = u2.user_id
            $whereClause
            ORDER BY a.CreatedOn DESC
        ");
        $stmt->execute($params);
        sendResponse(true, 'Announcements fetched successfully', $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // GET - List published announcements
    elseif ($method == 'GET' && $action == 'get_published') {
        $where = ["a.Status = 'Published'"];
        $params = [];
        applyAudienceFilter($where, $params, $user_type);
        $whereClause = 'WHERE ' . implode(' AND ', $where);

        $stmt = $pdo->prepare("
            SELECT a.*
            FROM announcements a
            $whereClause
            ORDER BY a.CreatedOn DESC
        ");
        $stmt->execute($params);
        sendResponse(true, 'Published announcements fetched successfully', $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // POST - Add announcement
    elseif ($method == 'POST' && $action == 'add') {
        $title = $input['Title'] ?? '';
        $content = $input['Content'] ?? '';
        $targetAudience = $input['TargetAudience'] ?? 'All';
        $priority = $input['Priority'] ?? 'Medium';
        $publishDate = $input['PublishDate'] ?? date('Y-m-d H:i:s');
        $expiryDate = $input['ExpiryDate'] ?? null;
        $status = $input['Status'] ?? 'Draft';
        $clubId = $input['club_id'] ?? $input['ClubID'] ?? null;
        $sendEmail = $input['SendEmailNotification'] ?? 0;
        $sendPush = $input['SendPushNotification'] ?? 0;

        if (empty($title) || empty($content)) {
            sendResponse(false, 'Title and content are required');
        }

        $stmt = $pdo->prepare("
            INSERT INTO announcements (Title, Content, TargetAudience, Priority, PublishDate, ExpiryDate, Status, club_id, CreatedOn)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$title, $content, $targetAudience, $priority, $publishDate, $expiryDate, $status, $clubId]);
        $announcementId = $pdo->lastInsertId();

        $responseData = ['AnnouncementID' => $announcementId];
        $notifications = [];

        if ($status === 'Published') {
            if ($sendEmail) {
                $recipients = getRecipients($pdo, $targetAudience, $clubId);
                $notifications['recipient_count'] = count($recipients);
                $notifications['emails_sent'] = 0;
                $notifications['email_failed'] = 0;
                $emailError = null;

                foreach ($recipients as $recipient) {
                    $emailBody = "
                        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 12px;'>
                            <div style='text-align: center; margin-bottom: 20px;'>
                                <h2 style='color: #4A90E2; margin: 0;'>CAMS</h2>
                                <p style='color: #666; font-size: 14px;'>Clubs & Activities Management System</p>
                            </div>
                            <p style='font-size: 15px; color: #333;'>Hi <strong>{$recipient['user_name']}</strong>,</p>
                            <h3 style='color: #333;'>{$title}</h3>
                            <p style='font-size: 14px; color: #555; line-height: 1.6;'>{$content}</p>
                            <hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;' />
                            <p style='font-size: 12px; color: #aaa;'>This is an automated notification from CAMS.</p>
                        </div>
                    ";

                    $result = sendEmail($recipient['email'], "CAMS Announcement: {$title}", $emailBody);
                    if ($result === true) {
                        $notifications['emails_sent']++;
                    } else {
                        $notifications['email_failed']++;
                        if ($emailError === null) $emailError = $result;
                    }
                }

                $responseData['notifications'] = $notifications;
                if ($emailError) {
                    $responseData['email_error'] = $emailError;
                }
            }

            if ($sendPush) {
                $pushRecipients = getPushRecipients($pdo, $targetAudience, $clubId);
                $notifications['push_recipient_count'] = count($pushRecipients);
                $notifications['push_sent'] = 0;
                $notifications['push_failed'] = 0;

                foreach ($pushRecipients as $recipient) {
                    $result = sendPushNotification(
                        $recipient['push_token'],
                        "CAMS Announcement: {$title}",
                        $content
                    );
                    if ($result) {
                        $notifications['push_sent']++;
                    } else {
                        $notifications['push_failed']++;
                    }
                }

                $responseData['notifications'] = $notifications;
            }
        }

        sendResponse(true, 'Announcement created successfully', $responseData);
    }

    // POST - Update announcement
    elseif ($method == 'POST' && $action == 'update') {
        $announcementId = $input['AnnouncementID'] ?? null;
        $title = $input['Title'] ?? '';
        $content = $input['Content'] ?? '';
        $targetAudience = $input['TargetAudience'] ?? 'All';
        $priority = $input['Priority'] ?? 'Medium';
        $publishDate = $input['PublishDate'] ?? date('Y-m-d H:i:s');
        $expiryDate = $input['ExpiryDate'] ?? null;
        $status = $input['Status'] ?? 'Draft';
        $sendEmail = $input['SendEmailNotification'] ?? 0;
        $sendPush = $input['SendPushNotification'] ?? 0;

        if (empty($announcementId)) {
            sendResponse(false, 'Announcement ID is required');
        }

        $stmt = $pdo->prepare("
            UPDATE announcements
            SET Title = ?, Content = ?, TargetAudience = ?, Priority = ?,
                PublishDate = ?, ExpiryDate = ?, Status = ?, ModifiedOn = NOW()
            WHERE AnnouncementID = ?
        ");
        $stmt->execute([$title, $content, $targetAudience, $priority, $publishDate, $expiryDate, $status, $announcementId]);

        $responseData = [];
        $notifications = [];

        if ($status === 'Published') {
            if ($sendEmail) {
                $recipients = getRecipients($pdo, $targetAudience, $input['club_id'] ?? null);
                $notifications['recipient_count'] = count($recipients);
                $notifications['emails_sent'] = 0;
                $notifications['email_failed'] = 0;
                $emailError = null;

                foreach ($recipients as $recipient) {
                    $emailBody = "
                        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 12px;'>
                            <div style='text-align: center; margin-bottom: 20px;'>
                                <h2 style='color: #4A90E2; margin: 0;'>CAMS</h2>
                                <p style='color: #666; font-size: 14px;'>Clubs & Activities Management System</p>
                            </div>
                            <p style='font-size: 15px; color: #333;'>Hi <strong>{$recipient['user_name']}</strong>,</p>
                            <h3 style='color: #333;'>{$title}</h3>
                            <p style='font-size: 14px; color: #555; line-height: 1.6;'>{$content}</p>
                            <hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;' />
                            <p style='font-size: 12px; color: #aaa;'>This is an automated notification from CAMS.</p>
                        </div>
                    ";

                    $result = sendEmail($recipient['email'], "CAMS Announcement: {$title}", $emailBody);
                    if ($result === true) {
                        $notifications['emails_sent']++;
                    } else {
                        $notifications['email_failed']++;
                        if ($emailError === null) $emailError = $result;
                    }
                }

                $responseData['notifications'] = $notifications;
                if ($emailError) {
                    $responseData['email_error'] = $emailError;
                }
            }

            if ($sendPush) {
                $pushRecipients = getPushRecipients($pdo, $targetAudience, $input['club_id'] ?? null);
                $notifications['push_recipient_count'] = count($pushRecipients);
                $notifications['push_sent'] = 0;
                $notifications['push_failed'] = 0;

                foreach ($pushRecipients as $recipient) {
                    $result = sendPushNotification(
                        $recipient['push_token'],
                        "CAMS Announcement: {$title}",
                        $content
                    );
                    if ($result) {
                        $notifications['push_sent']++;
                    } else {
                        $notifications['push_failed']++;
                    }
                }

                $responseData['notifications'] = $notifications;
            }
        }

        sendResponse(true, 'Announcement updated successfully', $responseData);
    }

    // POST - Delete announcement
    elseif ($method == 'POST' && $action == 'delete') {
        $announcementId = $input['AnnouncementID'] ?? null;

        if (empty($announcementId)) {
            sendResponse(false, 'Announcement ID is required');
        }

        $stmt = $pdo->prepare("DELETE FROM announcements WHERE AnnouncementID = ?");
        $stmt->execute([$announcementId]);

        sendResponse(true, 'Announcement deleted successfully');
    }

    // POST - Update announcement status
    elseif ($method == 'POST' && $action == 'update_status') {
        $announcementId = $input['AnnouncementID'] ?? null;
        $status = $input['Status'] ?? '';

        if (empty($announcementId) || empty($status)) {
            sendResponse(false, 'Announcement ID and status are required');
        }

        $stmt = $pdo->prepare("UPDATE announcements SET Status = ?, ModifiedOn = NOW() WHERE AnnouncementID = ?");
        $stmt->execute([$status, $announcementId]);

        sendResponse(true, 'Announcement status updated successfully');
    }

    else {
        sendResponse(false, 'Invalid action or method');
    }

} catch (PDOException $e) {
    error_log("Database Error: " . $e->getMessage());
    sendResponse(false, 'Database error: ' . $e->getMessage());
} catch (Exception $e) {
    error_log("Server Error: " . $e->getMessage());
    sendResponse(false, 'Server error: ' . $e->getMessage());
}
