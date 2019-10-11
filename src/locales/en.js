/* eslint-disable camelcase */
const dict = Object.freeze({
    notAdmin: 'User "%{sender}" don\'t have admin status for this command',
    setBotToAdmin: 'Incorrect bot status in project [%{projectKey}](%viewUrl), ask admin for help',
    noRulesToWatchIssue: 'Bot don\'t have permission to watch or make actions in this Jira issue',
    comment_created: '%{name} commented',
    comment_updated: '%{name} changed comment',
    issue_updated: '%{name} changed issue',
    issueHasChanged: 'Task was changed',
    statusHasChanged: '%{key} "%{summary}" now has status "%{status}"',
    statusHasChangedMessage: '%{name} changed a linked issue status [%{key} "%{summary}"](%{viewUrl}) to **%{status}**',
    newIssueInEpic: 'New issue in epic',
    issueAddedToEpic: 'An issue [%{key} %{summary}](%{viewUrl}) was added to the epic',
    newLink: 'New link',
    newLinkMessage: 'A new link. This issue **%{relation}** [%{key} "%{summary}"](%{viewUrl})',
    deleteLink: 'Delete link',
    deleteLinkMessage: 'Link deleted. This issue **%{relation}** [%{key} "%{summary}"](%{viewUrl})',
    miss: 'missing',
    epicAddedToProject: 'An epic [%{key} %{summary}](%{viewUrl}) was added to the project',
    newEpicInProject: 'New epic in project',
    statusEpicChanged: 'Epic was changed',
    statusEpicChangedMessage: '%{name} changed a linked epic status [%{key} "%{summary}"](%{viewUrl}) to **%{status}**',
    errorMatrixCommands: 'Something went wrong! Your request failed, please try again.',
    errorMatrixAssign: 'The observer %{userToFind} not added! Check your username and try again',
    successMatrixInvite: 'User %{sender} invited in room %{roomName}',
    successMatrixAssign: 'User "%{displayName}" assigned as issue performer',
    emptyMatrixComment: 'Add comment body',
    listUsers: 'List users',
    successMatrixComment: 'Comment published',
    listJiraCommand: 'List of available commands',
    errorMoveJira: 'New status with name "%{bodyText}" not found',
    successMoveJira: 'Issue status changed by user %{sender} to %{name}',
    errorWatcherJira: 'The watcher is not added! Check user name and try again',
    successWatcherJira: 'Watcher is added',
    notFoundUser: 'User %{user} is not in current room',
    notFoundRoom: 'Room "%{roomName}" is not found',
    notFoundPrio: 'New priority with name "%{bodyText}" is not found',
    setPriority: 'Now issue has the priority %{name}',
    successUserKick: 'User %{user} is kicked from room %{roomName}',
    errorUserKick: 'Error kicking user %{user} from room %{roomName}',
    kickInfo: 'User %{sender} has kicked next members from rooms:',
    powerUp: 'User %{targetUser} became a moderator for room %{roomName}',
    currentIgnoreSettings: 'Current ignore-settings for project "%{project}": ',
    varsComandsIgnoreSettings: 'You can use comands add or del types, for example<br>!ignore add Error<br>!ignore del Error',
    emptyIgnoreList: 'For project %{project} ignore list is empty.<br>You can add ignore key !ignore add Error',
    notIgnoreKey: 'Write key.<br>!ignore add <b>Task</b>',
    notKeyInProject: 'Such key not found in project "%{project}".<br>You can use keys:',
    keyNotFoundForDelete: 'This key not found in ignore list for project "%{project}".',
    keyAlreadyExistForAdd: 'Key "%{typeTaskFromUser}" already exist in project "%{project}"',
    commandNotFound: 'Command not found.',
    ignoreKeyAdded: 'Key "%{typeTaskFromUser}" was added for project "%{project}".',
    ignoreKeyDeleted: 'Key "%{typeTaskFromUser}" was deleted for project "%{project}".',
});

module.exports.dict = dict;
