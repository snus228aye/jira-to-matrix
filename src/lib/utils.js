const translate = require('../locales');
const Ramda = require('ramda');
const {jira, features, messenger} = require('../config');
const {epicUpdates, postChangesToLinks} = features;
const messages = require('./messages');

const {field: epicField} = epicUpdates;
const {url: jiraUrl} = jira;

const REDIS_ROOM_KEY = 'newrooms';
// TODO: change until start correct bot work
const ROOMS_OLD_NAME = 'rooms';
const REDIS_LINK_PREFIX = 'link';
const REDIS_EPIC_PREFIX = 'epic';

const DELIMITER = '|';
const KEYS_TO_IGNORE = [ROOMS_OLD_NAME, DELIMITER];
const [COMMON_NAME] = messenger.domain.split('.').slice(1, 2);
const JIRA_REST = 'rest/api/2';

const INDENT = '&nbsp;&nbsp;&nbsp;&nbsp;';
const LINE_BREAKE_TAG = '<br>';

const NEW_YEAR_2018 = new Date(Date.UTC(2018, 0, 1, 3));

const getIdFromUrl = url => {
    const [res] = url
        .split('/')
        .reverse()
        .slice(2, 3);
    return res;
};

const handlers = {
    project: {
        getProjectKey: body => Ramda.path(['project', 'key'], body),
        getCreator: body => Ramda.path(['project', 'projectLead', 'name'], body),
        getIssueName: body => handlers.project.getProjectKey(body),
        getMembers: body => [handlers.project.getCreator(body)],
    },
    issue: {
        getDisplayName: body => Ramda.path(['user', 'displayName'], body),
        getSummary: body => Ramda.path(['issue', 'fields', 'summary'], body),
        getUserName: body => Ramda.path(['user', 'name'], body),
        getEpicKey: body => Ramda.path(['issue', 'fields', epicField], body),
        getType: body => Ramda.path(['issue', 'fields', 'issuetype', 'name'], body),
        getIssueId: body => Ramda.path(['issue', 'id'], body),
        getIssueKey: body => Ramda.path(['issue', 'key'], body),
        getCreator: body =>
            Ramda.path(['issue', 'fields', 'creator', 'name'], body),
        getReporter: body =>
            Ramda.path(['issue', 'fields', 'reporter', 'name'], body),
        getAssignee: body =>
            Ramda.path(['issue', 'fields', 'assignee', 'name'], body),
        getMembers: body => {
            const possibleMembers = ['getReporter', 'getCreator', 'getAssignee']
                .map(func => handlers.issue[func](body))
                .filter(Boolean);

            return [...new Set(possibleMembers)];
        },
        getChangelog: body => Ramda.path(['issue', 'changelog'], body),
        getHookChangelog: body => Ramda.path(['changelog'], body),
        getProject: body => Ramda.path(['issue', 'fields', 'project'], body),
        getProjectKey: body => Ramda.path(['key'], handlers.issue.getProject(body)),
        getIssueName: body => handlers.issue.getIssueKey(body),
        getLinks: body => Ramda.path(['issue', 'fields', 'issuelinks'], body),
    },
    comment: {
        getComment: body => Ramda.path(['comment'], body),
        getDisplayName: body =>
            Ramda.path(['comment', 'author', 'displayName'], body),
        getAuthor: body => Ramda.path(['comment', 'author', 'name'], body),
        getUpdateAuthor: body =>
            Ramda.path(['comment', 'updateAuthor', 'name'], body),
        getCreator: body =>
            handlers.comment.getUpdateAuthor(body) ||
      handlers.comment.getAuthor(body),
        getUrl: body => Ramda.path(['comment', 'self'], body),
        getIssueId: body => getIdFromUrl(handlers.comment.getUrl(body)),
        getIssueName: body => handlers.comment.getIssueId(body),
        getCommentBody: body => ({
            body: Ramda.path(['comment', 'body'], body),
            id: Ramda.path(['comment', 'id'], body),
        }),
    },
    issuelink: {
        getLinks: body => [Ramda.path(['issueLink'], body)],
        getIssueName: body => Ramda.path(['issueLink', 'id'], body),
        getIssueLinkSourceId: body =>
            Ramda.path(['issueLink', 'sourceIssueId'], body),
        getIssueLinkDestinationId: body =>
            Ramda.path(['issueLink', 'destinationIssueId'], body),
        getSourceRelation: body =>
            Ramda.path(['issueLink', 'issueLinkType', 'outwardName'], body),
        getDestinationRelation: body =>
            Ramda.path(['issueLink', 'issueLinkType', 'inwardName'], body),
    },
};

const matrixMethods = {
    composeRoomName: (key, summary) => `${key} ${summary}`,
    getChatUserId: shortName => `@${shortName.toLowerCase()}:${messenger.domain}`,
};

const slackMethods = {
    composeRoomName: key => `${key.toLowerCase()}`,
    getChatUserId: shortName => `${shortName}@${messenger.domain}`,
};

const getMethodByType = (name, chatType = messenger.name) => {
    const obj = {
        matrix: matrixMethods,
        slack: slackMethods,
    };

    return obj[chatType][name];
};

const utils = {
    // * ----------------------- Webhook selectors ------------------------- *

    getHookType: body => {
        const eventType = utils.getTypeEvent(body);
        if (eventType) {
            return 'issue';
        }
        const event = utils.getBodyWebhookEvent(body);

        return event && event.split('_')[0];
    },

    getHandler: body => {
        const type = utils.getHookType(body);

        return type && handlers[type];
    },

    runMethod: (body, method) => {
        const handler = utils.getHandler(body);

        return handler && handler[method] && handler[method](body);
    },

    getDisplayName: body => utils.runMethod(body, 'getDisplayName'),

    getMembers: body => utils.runMethod(body, 'getMembers') || handlers.issue.getMembers({issue: body}),

    getIssueId: body => utils.runMethod(body, 'getIssueId'),

    getIssueKey: body => utils.runMethod(body, 'getIssueKey'),

    getIssueName: body => utils.runMethod(body, 'getIssueName'),

    getCreator: body => utils.runMethod(body, 'getCreator'),

    getProjectKey: body => utils.runMethod(body, 'getProjectKey'),

    getLinks: body => utils.runMethod(body, 'getLinks'),

    getTypeEvent: body => Ramda.path(['issue_event_type_name'], body),

    getChangelog: body => {
        const type = utils.getHandler(body);

        return type.getChangelog(body) || type.getHookChangelog(body);
    },

    getCommentAuthor: body => handlers.comment.getAuthor(body),

    getComment: body => handlers.comment.getComment(body),

    getCommentBody: body => handlers.comment.getCommentBody(body),

    getUserName: body => handlers.issue.getUserName(body),

    getEpicKey: body => handlers.issue.getEpicKey(body),

    getKey: body => handlers.issue.getIssueKey(body) || Ramda.path(['key'], body),

    getIssueLinkSourceId: body => handlers.issuelink.getIssueLinkSourceId(body),

    getIssueLinkDestinationId: body =>
        handlers.issuelink.getIssueLinkDestinationId(body),

    getSourceRelation: body => handlers.issuelink.getSourceRelation(body),

    getDestinationRelation: body =>
        handlers.issuelink.getDestinationRelation(body),

    getSummary: body =>
        utils.runMethod(body, 'getSummary') || utils.getResponcedSummary(body),

    getBodyTimestamp: body => Ramda.path(['timestamp'], body),

    getBodyWebhookEvent: body => Ramda.path(['webhookEvent'], body),

    getHookUserName: body =>
        utils.getCommentAuthor(body) || utils.getUserName(body),

    getChangelogItems: body =>
        Ramda.pathOr([], ['items'], utils.getChangelog(body)),

    isCorrectWebhook: (body, hookName) =>
        utils.getBodyWebhookEvent(body) === hookName,

    isEpic: body => handlers.issue.getType(body) === 'Epic',

    isCommentEvent: body =>
        utils.getHookType(body) === 'comment' &&
    !utils.getBodyWebhookEvent(body).includes('deleted'),

    /**
   * Get changelog field body from webhook from jira
   * @param {string} fieldName key of changelog field
   * @param {object} body webhook body
   * @return {object} changelog field
   */
    getChangelogField: (fieldName, body) =>
        utils.getChangelogItems(body).find(item => item.field === fieldName),

    getNewSummary: body =>
        Ramda.path(['toString'], utils.getChangelogField('summary', body)),

    getNewStatus: body =>
        Ramda.path(['toString'], utils.getChangelogField('status', body)),

    getNewKey: body =>
        Ramda.path(['toString'], utils.getChangelogField('Key', body)),

    getOldKey: body =>
        Ramda.path(['fromString'], utils.getChangelogField('Key', body)),

    getRelations: issueLinkBody => ({
        inward: {
            relation: Ramda.path(['type', 'inward'], issueLinkBody),
            related: issueLinkBody.inwardIssue,
        },
        outward: {
            relation: Ramda.path(['type', 'outward'], issueLinkBody),
            related: issueLinkBody.outwardIssue,
        },
    }),

    getDescriptionFields: body => ({
        assigneeName: utils.getTextIssue(body, 'assignee.displayName'),
        assigneeEmail: utils.getTextIssue(body, 'assignee.emailAddress'),
        reporterName: utils.getTextIssue(body, 'reporter.displayName'),
        reporterEmail: utils.getTextIssue(body, 'reporter.emailAddress'),
        typeName: utils.getTextIssue(body, 'issuetype.name'),
        epicLink: utils.getTextIssue(body, 'customfield_10006'),
        estimateTime: utils.getTextIssue(body, 'timetracking.originalEstimate'),
        description: utils.getTextIssue(body, 'description'),
        priority: utils.getTextIssue(body, 'priority.name'),
    }),

    getHeaderText: body => {
        const name = handlers.comment.getDisplayName(body);
        const eventName = utils.getBodyWebhookEvent(body);

        return translate(eventName, {name});
    },

    getTextIssue: (body, path) => {
        const params = path.split('.');
        const text = String(
            Ramda.path(['issue', 'fields', ...params], body) || translate('miss')
        ).trim();

        return text;
    },

    getLinkKeys: body => {
        const links = utils.getLinks(body);

        return links.reduce((acc, link) => {
            const destIssue = Ramda.either(
                Ramda.prop('outwardIssue'),
                Ramda.prop('inwardIssue')
            )(link);

            const destStatusCat = Ramda.path(
                ['fields', 'status', 'statusCategory', 'id'],
                destIssue
            );
            if (postChangesToLinks.ignoreDestStatusCat.includes(destStatusCat)) {
                return acc;
            }
            return [...acc, destIssue.key];
        }, []);
    },

    // * ------------------------- Request selectors ------------------------- *

    getProjectPrivateStatus: body => Ramda.path(['isPrivate'], body),

    getProjectStyle: body => Ramda.path(['style'], body),

    isNewGenProjectStyle: body => utils.getProjectStyle(body) === 'new-gen',

    isIgnoreProject: body =>
        utils.isNewGenProjectStyle(body) && utils.getProjectPrivateStatus(body),

    getResponcedSummary: body => Ramda.path(['fields', 'summary'], body),

    getInwardLinkKey: body => Ramda.path(['inwardIssue', 'key'], body),

    getOutwardLinkKey: body => Ramda.path(['outwardIssue', 'key'], body),

    // * --------------------------------- Redis utils ------------------------------- *

    getRedisLinkKey: id => [REDIS_LINK_PREFIX, DELIMITER, id].join(''),

    getRedisEpicKey: id => [REDIS_EPIC_PREFIX, DELIMITER, id].join(''),

    getRedisKey: (funcName, body) =>
        [funcName, utils.getBodyTimestamp(body)].join('_'),

    isIgnoreKey: key => !KEYS_TO_IGNORE.some(val => key.includes(val)),

    // * --------------------------------- Error handling ---------------------------- *

    getDefaultErrorLog: funcName => `Error in ${funcName}`,

    errorTracing: (name, err) => {
        const log = messages[name] || utils.getDefaultErrorLog(name);

        return [log, err].join('\n');
    },

    // * --------------------------------- Request utils ------------------------------- *

    auth: () => {
        const {user, password} = jira;
        const encoded = Buffer.from(`${user}:${password}`).toString('base64');

        return `Basic ${encoded}`;
    },

    getRestUrl: (...args) => [jiraUrl, JIRA_REST, ...args].join('/'),

    getViewUrl: (key, type = 'browse') => [jiraUrl, type, key].join('/'),

    // * --------------------------------- Matrix utils ------------------------------- *

    // Parse body of event from Matrix
    parseEventBody: body => {
        try {
            const trimedBody = body.trim();

            const commandName = trimedBody
                .split(' ')[0]
                .match(/^!\w+$/g)[0]
                .substring(1);

            if (`!${commandName}` === trimedBody) {
                return {commandName};
            }

            const bodyText = trimedBody
                .replace(`!${commandName}`, '')
                .trim();

            return {commandName, bodyText};
        } catch (err) {
            return {};
        }
    },

    getNameFromMatrixId: id => {
        const [name] = id.split(':').slice(0, 1);

        return name.slice(1);
    },


    isAdmin: user => messenger.admins.includes(user),

    getChatUserId: getMethodByType('getChatUserId'),

    // * --------------------------------- Other utils ------------------------------- *

    getProjectKeyFromIssueKey: issueKey => issueKey.split('-').slice(0, 1),
    getCommandAction: (val, collection) =>
        collection.find(
            ({id, name}) => id === val || name.toLowerCase() === val.toLowerCase()
        ),

    getLimit: () => NEW_YEAR_2018.getTime(),

    getListToHTML: list =>
        list.reduce(
            (acc, {name, displayName}) =>
                `${acc}<strong>${name}</strong> - ${displayName}<br>`,
            `${translate('listUsers')}:<br>`
        ),

    getCommandList: list =>
        list.reduce(
            (acc, {name, id}) => `${acc}<strong>${id})</strong> - ${name}<br>`,
            `${translate('listJiraCommand')}:<br>`
        ),

    expandParams: {expand: 'renderedFields'},

    propIn: Ramda.curry((prop, arr, obj) =>
        Ramda.or(arr, []).includes(Ramda.or(obj, {})[prop])
    ),

    nonEmptyString: Ramda.both(Ramda.is(String), Ramda.complement(Ramda.isEmpty)),

    composeRoomName: getMethodByType('composeRoomName'),

    getClosedDescriptionBlock: data =>
        [utils.getOpenedDescriptionBlock(data), LINE_BREAKE_TAG].join(''),

    getOpenedDescriptionBlock: data => [LINE_BREAKE_TAG, INDENT, data].join(''),

    helpPost: `
    <h5>Use "!comment" command to comment in jira issue<br>
    example:</h5>
        ${INDENT}<font color="green"><strong>!comment some text</strong></font><br>
        ${INDENT}text "<font color="green">some text</font>" will be shown in jira comments<br>
    <h5>Use "!assign" command to assign jira issue<br>
    example:</h5>
        ${INDENT}<font color="green"><strong>!assign mv_nosak</strong></font>
        or <font color="green"><strong>!assign Носак</strong></font><br>
        ${INDENT}user '<font color="green">mv_nosak</font>' will become assignee for the issue<br><br>
        ${INDENT}<font color="green"><strong>!assign</strong></font><br>
        ${INDENT}you will become assignee for the issue
    <h5>Use "!move" command to view list of available transitions<br>
    example:</h5>
        ${INDENT}<font color="green"><strong>!move</strong></font><br>
        ${INDENT}you will see a list:<br>
        ${INDENT}${INDENT}1) Done<br>
        ${INDENT}${INDENT}2) On hold<br>
        ${INDENT}Use <font color="green"><strong>"!move done"</strong></font> or
        <font color="green"><strong>"!move 1"</strong></font>
    <h5>Use "!spec" command to add watcher for issue<br>
    example:</h5>
        ${INDENT}<font color="green"><strong>!spec mv_nosak</strong></font>
        or <font color="green"><strong>!spec Носак</strong></font><br>
        ${INDENT}user '<font color="green">mv_nosak</font>' was added in watchers for the issue<br><br>
    <h5>Use "!prio" command to changed priority issue<br>
    example:</h5>
        ${INDENT}<font color="green"><strong>!prio</strong></font><br>
        ${INDENT}you will see a list:<br>
        ${INDENT}${INDENT}1) Блокирующий<br>
        ${INDENT}${INDENT}2) Критический<br>
        ${INDENT}${INDENT}3) Highest<br>
        ${INDENT}${INDENT}...<br>
        ${INDENT}${INDENT}7) Lowest<br>
        ${INDENT}Use <font color="green"><strong>"!prio Lowest"</strong></font> or
        <font color="green"><strong>"!prio 7"</strong></font>
    <h5>Use "!op" command to give moderator rights (admins only)<br>
    example:</h5>
        ${INDENT}<font color="green"><strong>!op mv_nosak</strong></font><br>
        ${INDENT}user '<font color="green">mv_nosak</font>' will become the moderator of the room<br><br>
    <h5>Use "!invite" command to invite you in room (admins only)<br>
    example:</h5>
        ${INDENT}<font color="green"><strong>!invite BBCOM-101</strong></font>
        or <font color="green"><strong>!invite #BBCOM-101:messenger.domain</strong></font><br>
        ${INDENT}Bot invite you in room for issue <font color="green">BBCOM-101</font><br><br>
    If you have administrator status, you can invite the bot into the room and he will not be denied:)
    `,
};

module.exports = {
    INDENT,
    REDIS_ROOM_KEY,
    COMMON_NAME,
    ...utils,
};
