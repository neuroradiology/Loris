<?php
/**
 * Issue tracker
 *
 * Handles issue edits and returns data in response to a front end call.
 *
 * PHP Version 5
 *
 * @category Loris
 * @package  Issue Tracker
 * @author   Caitrin Armstrong <caitrin.mcin@gmail.com>
 * @license  http://www.gnu.org/licenses/gpl-3.0.txt GPLv3
 * @link     https://github.com/aces/Loris-Trunk
 */

/**
 * Issue tracker
 *
 * Handles issue edits and returns data in response to a front end call.
 *
 * PHP Version 5
 *
 * @category Loris
 * @package  Issue Tracker
 * @author   Caitrin Armstrong <caitrin.mcin@gmail.com>
 * @license  http://www.gnu.org/licenses/gpl-3.0.txt GPLv3
 * @link     https://github.com/aces/Loris-Trunk
 */

require_once "Email.class.inc";

//TODO: or split it into two files... :P
if ($_SERVER['REQUEST_METHOD'] === "GET") {
    echo json_encode(getIssueFields());
} else if ($_SERVER['REQUEST_METHOD'] === "POST") {
    echo json_encode(editIssue());
} else {
    header("HTTP/1.1 403 Forbidden");
    exit;
}

//TODO: encapsulate more
/**
 * Either updates an old issue or adds a new one
 *
 * @throws DatabaseException
 *
 * @return array indicating insertion success or failure
 */
function editIssue()
{
    $db =& Database::singleton();
    $user =& User::singleton();

    $issueValues = array();
    $validateValues = array();
    $fields = array(
        'assignee',
        'status',
        'priority',
        'centerID',
        'title',
        'category',
        'module',
    );
    $fieldsToValidateFirst = array(
        'PSCID',
        'visitLabel',
    );

    foreach ($fields as $field) {
        if (isset($_POST[$field])) {
            $issueValues[$field] = $_POST[$field];
        }
    }

    foreach ($fieldsToValidateFirst as $vField) {
        if (isset($_POST[$vField])) {
            $validateValues[$vField] = $_POST[$vField];
        }
    }

    $issueID = $_POST['issueID'];
    $issueValues['lastUpdatedBy'] = $user->getData('UserID');

    //this whole validation thing really needs some best practice love
    $validatedInput = validateInput($validateValues, $issueID);
    if ($validatedInput['isValidSubmission']) {
        if (array_key_exists('sessionID', $validatedInput)) {
            $issueValues['sessionID'] = $validatedInput['sessionID'];
        }
        if (array_key_exists('candID', $validatedInput)) {
            $issueValues['candID'] = $validatedInput['candID'];
        }
    } else {
        return $validatedInput;
    } //aka when it's not valid

    if (!empty($issueID) || $issueID != 0) {
        $db->update('issues', $issueValues, ['issueID' => $issueID]);
    } else {
        $issueValues['reporter'] = $user->getData('UserID');
        $issueValues['dateCreated'] = date('Y-m-d H:i:s');
        $db->insert('issues', $issueValues);
        $issueID = $db->getLastInsertId();
    }

    updateHistory($issueValues, $issueID);

    //adding comment in now that I have an issueID for both new and old.
    if ($_POST['comment'] != null) {
        $commentValues = array(
            'issueComment' => $_POST['comment'],
            'addedBy' => $user->getData('UserID'),
            'issueID' => $issueID,
        );
        $db->insert('issues_comments', $commentValues);
    }

    //adding new assignee to watching
    if (isset($issueValues['assignee'])) {
        $nowWatching = array(
            'userID' => $issueValues['assignee'],
            'issueID' => $issueID,
        );
        $db->replace('issues_watching', $nowWatching);
    }

    //adding editor to the watching table unless they don't want to be added.
    if ($_POST['watching'] == 'Yes') {
        $nowWatching = array(
            'userID' => $user->getData('UserID'),
            'issueID' => $issueID,
        );
        $db->replace('issues_watching', $nowWatching);
    } else if ($_POST['watching'] == "No") {
        $db->delete(
            'issues_watching',
            array(
                'issueID' => $issueID,
                'userID' => $user->getData('UserID'),
            )
        );
    }

    //adding others from multiselect to watching table.
    if (isset($_POST['othersWatching'])) {
        $othersNowWatching = explode(',', $_POST['othersWatching']);
        foreach ($othersNowWatching as $userWatching) {
            if ($userWatching) { //cause sometimes it sends null
                $nowWatching = array(
                    'userID' => $userWatching,
                    'issueID' => $issueID,
                );
                $db->replace('issues_watching', $nowWatching);
            }
        }
    }

    //sending email
    emailUser($issueID, $issueValues['assignee']);

    return array(
        'isValidSubmission' => true,
        'issueID' => $issueID,
    );
}

//also make this better
/**
 * Validates those fields that need it
 * Currently PSCID and visitLabel as fk to session
 *
 * @param array $validateValues values to be validated
 * @param int $issueID issue ID
 *
 * @throws DatabaseException
 *
 * @return array success with values, or error with message.
 */
function validateInput($validateValues, $issueID)
{
    $db =& Database::singleton();
    $user =& User::singleton();

    $old = null;
    if ($issueID) {
        $old = $db->pSelect(
            "SELECT c.PSCID, s.Visit_label from candidate c 
LEFT JOIN issues i ON (i.candID = c.CandID) 
LEFT JOIN session s ON (i.sessionID = s.ID) 
WHERE i.issueID=:issueID",
            array('issueID' => $issueID)
        );//inner join because you only want if it has these values.
    }

    $oldPSCID = $old[0]['PSCID'];
    $oldVisitLabel = $old['Visit_label'];
    if ((isset($validateValues['visitLabel']) && $oldPSCID)
        || (isset($validateValues['PSCID']) && $oldVisitLabel)
    ) {
        $PSCID = $oldPSCID;
        $visitLabel = $oldVisitLabel;
        if (isset($validateValues['PSCID'])) {
            $PSCID = $validateValues['PSCID'];
        }
        if (isset($validateValues['visitLabel'])) {
            $visitLabel = $validateValues['visitLabel'];
        }
        $isValidSession = $db->pSelectOne(
            "SELECT s.ID FROM candidate c 
INNER JOIN session s on (c.CandID = s.CandID) 
WHERE c.PSCID=:PSCID and s.Visit_label=:visitLabel",
            array(
                'PSCID' => $PSCID,
                'visitLabel' => $visitLabel,
            )
        );
        if (!$isValidSession) {
            return array(
                'isValidSubmission' => false,
                'invalidMessage' => 'PSCID and Visit Label '
                    . 'do not match a valid candidate session',
            );
        } else if (!isset($validateValues['PSCID'])) {
            return array(
                'isValidSubmission' => true,
                'sessionID' => $isValidSession,
            );
        }
        //return here ^ if you're not evaluating a new PSCID.
        //Otherwise you need to go onto the else if below
        //To check that the user has permissions on that PSCID
    } else if (isset($validateValues['PSCID'])) {
        if ($user->hasPermission('access_all_profiles')) {
            $isValidCandidate = $db->pSelectOne(
                "SELECT CandID FROM candidate WHERE PSCID=:PSCID",
                array(
                    'PSCID' => $validateValues['PSCID'],
                )
            );
        } else {
            $isValidCandidate = $db->pSelectOne(
                "SELECT CandID FROM candidate WHERE PSCID=:PSCID
                 AND CenterID=:CenterID",
                array(
                    'PSCID' => $validateValues['PSCID'],
                    'CenterID' => $user->getCenterID()
                )
            );
        }
        if (!$isValidCandidate) {
            return array(
                'isValidSubmission' => false,
                'invalidMessage' => 'PSCID does not match a valid candidate',
            );
        } else {
            return array(
                'isValidSubmission' => true,
                'candID' => $isValidCandidate,
            );
        }
    } else if (isset($validateValues['visitLabel'])) {
        return array(
            'isValidSubmission' => false,
            'invalidMessage' => 'A Visit Label must be accompanied by a PSCID',
        );
    } else {
        return array('isValidSubmission' => true);
    } //phew
}

/**
 * Puts updated fields into the issues_history table.
 *
 * @param array $issueValues the new values
 * @param string $issueID the issue ID
 *
 * @throws DatabaseException
 *
 * @return void
 */
function updateHistory($issueValues, $issueID)
{
    $user =& User::singleton();
    $db =& Database::singleton();
    $undesiredFields = array(
        'lastUpdatedBy',
        'reporter',
        'dateCreated'
    );

    foreach ($issueValues as $key => $value) {
        if (in_array($key, $undesiredFields)) {
            continue;
        }
        if (!empty($value)) { //check that all kinds of nulls are being dealt with
            $changedValues = [
                'newValue' => $value,
                'fieldChanged' => $key,
                'issueID' => $issueID,
                'addedBy' => $user->getData('UserID'),
            ];
            $db->insert('issues_history', $changedValues);
        }
    }
}

/**
 * Will keep track of comment edit history
 *
 * @param int $issueCommentID the comment that is being edited
 * @param string $newCommentValue the new comment
 *
 * @throws DatabaseException
 *
 * @return void
 */
function updateCommentHistory($issueCommentID, $newCommentValue)
{
    $user =& User::singleton();
    $db =& Database::singleton();

    $changedValue = array(
        'issueCommentID' => $issueCommentID,
        'newValue' => $newCommentValue,
        'editedBy' => $user->getData('UserID'),
    );

    $db->insert('issues_comments_history', $changedValue);
}

/**
 * Gets a list of those watching an issue.
 *
 * @param int $issueID the relevant issue
 *
 * @throws DatabaseException
 *
 * @return array those who are watching
 */
function getWatching($issueID)
{
    $db =& Database::singleton();

    $watching = $db->pselect("SELECT userID from issues_watching WHERE issueID=:issueID",
        array('issueID' => $issueID));

    $whoIsWatching = array();
    foreach ($watching as $watcher) {
        $whoIsWatching[] = $watcher['userID'];
    }
    return $whoIsWatching;
}

/**
 * Gets the changes to values, and the comments relevant to the given issue
 *
 * @param int $issueID the issueID
 *
 * @throws DatabaseException
 *
 * @return array $commentHistory
 */
function getComments($issueID)
{
    $db =& Database::singleton();
    $unformattedComments = $db->pselect(
        "SELECT newValue, fieldChanged, dateAdded, addedBy " .
        "FROM issues_history where issueID=:issueID " .
        "UNION " .
        "SELECT issueComment, 'comment', dateAdded, addedBy " .
        "FROM issues_comments where issueID=:issueID " .
        "ORDER BY dateAdded",
        array('issueID' => $issueID)
    );

    //looping by reference so can edit in place
    foreach ($unformattedComments as &$comment) {
        if ($comment['fieldChanged'] === 'module') {
            $module = $db->pselectOne(
                "SELECT Label FROM LorisMenu WHERE ID=:module",
                array('module' => $comment['newValue'])
            );
            $comment['newValue'] = $module;
            continue;
        } else if ($comment['fieldChanged'] === 'centerID') {
            $site = $db->pselectOne(
                "SELECT Name FROM psc WHERE CenterID=:centerID",
                array('centerID' => $comment['newValue'])
            );
            $comment['newValue'] = $site;
            $comment['fieldChanged'] = 'site';
            continue;
        } else if ($comment['fieldChanged'] === 'candID') {
            $PSCID = $db->pselectOne(
                "SELECT PSCID FROM candidate WHERE CandID=:candID",
                array('candID' => $comment['newValue'])
            );
            $comment['newValue'] = $PSCID;
            $comment['fieldChanged'] = 'PSCID';
            continue;
        } else if ($comment['fieldChanged'] === 'sessionID') {
            $visitLabel = $db->pselectOne(
                "SELECT Visit_label FROM session WHERE ID=:sessionID",
                array('sessionID' => $comment['newValue'])
            );
            $comment['newValue'] = $visitLabel;
            $comment['fieldChanged'] = 'Visit Label';
        }
    }
    return $unformattedComments; //now formatted I guess

}

/**
 * Returns HTML of comment history
 *
 * @param int $issueID the issueID
 *
 * @return string
 */
function display_comments($issueID)
{
    $tpl_data['commentHistory'] = getComments($issueID);
    $smarty = new Smarty_neurodb("issue_tracker");
    $smarty->assign($tpl_data);
    $html = $smarty->fetch("issue_tracker_comment_history.tpl");
    return $html;
}

/**
 * Emails all users that are watching the issue with the changes.
 *
 * @param int $issueID the issueID
 *
 * @return array
 * @throws DatabaseException
 */
function emailUser($issueID, $changed_assignee)
{
    $user =& User::singleton();
    $db =& Database::singleton();
    //not sure if this is necessary
    $factory = NDB_Factory::singleton();
    $baseurl = $factory->settings()->getBaseURL();

    $title = $db->pSelectOne("SELECT title FROM issues 
        WHERE issueID=:issueID",
        array('issueID' => $issueID));

    $msg_data['url'] = $baseurl .
        "/issue_tracker/edit/?backURL=/issue_tracker/&issueID=" . $issueID;
    $msg_data['issueID'] = $issueID;
    $msg_data['currentUser'] = $user->getUsername();
    $msg_data['title'] = $title;
    
    if (isset($changed_assignee)) {
        $issue_change_emails_assignee = $db->pselect(
            "SELECT u.Email as Email, u.First_name as firstname " .
            "FROM users u WHERE u.UserID=:assignee
            AND u.UserID<>:currentUser",
            array(
                'assignee' => $changed_assignee,
                'currentUser' => $user->getUserName()
            )
        );
        $msg_data['firstname'] = $issue_change_emails_assignee[0]['firstname'];

        Email::send(
            $issue_change_emails_assignee[0]['Email'],
            'issue_assigned.tpl',
            $msg_data
        );
    } else {
        $changed_assignee = $user->getUsername(); // so query below doesn't break..
    }

    $issue_change_emails = $db->pselect(
        "SELECT u.Email as Email, u.First_name as firstname " .
        "FROM users u INNER JOIN issues_watching w ON (w.userID = u.userID) WHERE ".
        "w.issueID=:issueID AND u.UserID<>:uid AND u.UserID<>:assignee",
        array(
            'issueID' => $issueID,
            'uid' => $user->getUsername(),
            'assignee' => $changed_assignee
        )
    );

    $msg_data['url'] = $baseurl .
        "/issue_tracker/edit/?backURL=/issue_tracker/&issueID=" . $issueID;
    $msg_data['issueID'] = $issueID;
    $msg_data['currentUser'] = $user->getUsername();

    foreach ($issue_change_emails as $email) {
        $msg_data['firstname'] = $email['firstname'];
        Email::send($email['Email'], 'issue_change.tpl', $msg_data);
    }
}

/**
 * Returns a list of fields from database, including issue data
 *
 * @return array
 * @throws DatabaseException
 */
function getIssueFields()
{

    $db =& Database::singleton();
    $user =& User::singleton();

    //get field options
    if ($user->hasPermission('access_all_profiles')) {
        // get the list of study sites - to be replaced by the Site object
        $sites = Utility::getAssociativeSiteList();
    } else {
        // allow only to view own site data
        $site =& Site::singleton($user->getData('CenterID'));
        if ($site->isStudySite()) {
            $sites[$user->getData('CenterID')] = $user->getData('Site');
        }
    }

    //not yet ideal permissions
    $assignees = array();
    if ($user->hasPermission('access_all_profiles')) {
        $assignee_expanded = $db->pselect(
            "SELECT Real_name, UserID FROM users",
            array()
        );
    } else {
        $CenterID = $user->getCenterID();
        $DCCID = $db->pselectOne("SELECT CenterID from psc where Name='DCC'",
            array());
        $assignee_expanded = $db->pselect(
            "SELECT u.Real_name, u.UserID FROM users u 
WHERE (u.CenterID=:CenterID) OR (u.CenterID=:DCC)",
            array('CenterID' => $CenterID,
                'DCC' => $DCCID)
        );
    }

    foreach ($assignee_expanded as $a_row) {
        $assignees[$a_row['UserID']] = $a_row['Real_name'];
    }

    $otherWatchers = array();
    $potential_watchers_expanded = $db->pselect(
        "SELECT Real_name, UserID FROM users",
        array()
    );
    foreach ($potential_watchers_expanded as $w_row) {
        if ($w_row['UserID'] != $user->getData('UserID')) {
            $otherWatchers[$w_row['UserID']] = $w_row['Real_name'];
        }
    }

    //can't set to closed if not developer.
    if ($user->hasPermission('issue_tracker_developer')) {
        $statuses = array(
            'new' => 'New',
            'acknowledged' => 'Acknowledged',
            'assigned' => 'Assigned',
            'feedback' => 'Feedback',
            'resolved' => 'Resolved',
            'closed' => 'Closed',
        );
    } else {
        $statuses = array(
            'new' => 'New',
            'acknowledged' => 'Acknowledged',
            'assigned' => 'Assigned',
            'feedback' => 'Feedback',
            'resolved' => 'Resolved',
        );
    }

    $priorities = array(
        'low' => 'Low',
        'normal' => 'Normal',
        'high' => 'High',
        'urgent' => 'Urgent',
        'immediate' => 'Immediate',
    );

    $unorgCategories = $db -> pselect( "SELECT categoryName
        FROM issues_categories", []);
    $categories = array('' => "All");
    foreach ($unorgCategories as $r_row) {
        $categoryName = $r_row['categoryName'];
        if ($categoryName) {
            $categories[$categoryName] = $categoryName;
        }
    }


    $modules = array();
    $modules_expanded = $db->pselect(
        "SELECT DISTINCT Label, ID FROM LorisMenu 
WHERE Parent IS NOT NULL ORDER BY Label ",
        []
    );
    foreach ($modules_expanded as $m_row) {
        $modules[$m_row['ID']] = $m_row['Label'];
    }

    //Now get issue values
    $issueData = null;
    if (!empty($_GET['issueID'])) { //if an existing issue
        $issueID = $_GET['issueID'];
        $issueData = $db->pselectRow(
            "SELECT i.*, c.PSCID, s.Visit_label FROM issues as i " .
            "LEFT JOIN candidate c ON (i.candID=c.CandID)" .
            "LEFT JOIN session s ON (i.sessionID=s.ID) " .
            "WHERE issueID=:issueID",
            array('issueID' => $issueID)
        );
        $issueData['commentHistory'] = getComments($issueID);
        $issueData['whoIsWatching'] = getWatching($issueID);
        $issueData['desc'] = $db->pSelectOne("SELECT issueComment 
FROM issues_comments WHERE issueID=:issueID 
ORDER BY dateAdded", array('issueID' => $issueID));

    } else { //just setting the default values
        $issueData['reporter'] = $user->getData('UserID');
        $issueData['dateCreated'] = date('Y-m-d H:i:s');
        $issueData['centerID'] = $user->getData('CenterID');
        $issueData['status'] = "new";
        $issueData['priority'] = "normal";
        $issueData['issueID'] = 0; //TODO: this is dumb
        $issueData['title'] = null;
        $issueData['lastUpdate'] = null;
        $issueData['PSCID'] = null;
        $issueData['assignee'] = null;
        $issueData['history'] = null;
        $issueData['watching'] = null;
        $issueData['visitLabel'] = null;
        $issueData['category'] = null;
        $issueData['lastUpdatedBy'] = null;
    }

    $isWatching = $db->pselectOne(
        "SELECT * FROM issues_watching WHERE issueID=:issueID AND userID=:userID",
        array(
            'issueID' => $issueID,
            'userID' => $user->getData('UserID'),
        )
    );

    $issueData['watching'] = $isWatching;
    $issueData['comment'] = null;

    if ($issueData['reporter'] == $user->getData('UserID')) {
        $isOwnIssue = true;
    } else {
        $isOwnIssue = false;
    }

    $result = [
        'assignees' => $assignees,
        'sites' => $sites,
        'statuses' => $statuses,
        'priorities' => $priorities,
        'categories' => $categories,
        'modules' => $modules,
        'otherWatchers' => $otherWatchers,
        'issueData' => $issueData,
        'hasEditPermission' => $user->hasPermission(
            'issue_tracker_developer'
        ),
        'isOwnIssue' => $isOwnIssue,
    ];

    return $result;
}