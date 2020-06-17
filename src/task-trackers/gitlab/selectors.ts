import { GitlabIssueHook, GitlabCommentHook, HookTypes, GitlabSelectors, GitlabIssue } from './types';
import { translate } from '../../locales';
import { DescriptionFields, IssueChanges } from '../../types';

/**
 * @example namespace/project-123
 */
const transformFromKey = (key: string): { namespaceWithProject: string; issueId: number } => {
    const [issueId, ...keyReversedParts] = key
        .toLowerCase()
        .split('-')
        .reverse();
    const namespaceWithProject = keyReversedParts.reverse().join('-');

    return { namespaceWithProject, issueId: Number(issueId) };
};

const transformToKey = (namespaceWithProject: string, issueId: number): string =>
    [namespaceWithProject, issueId].join('-');

interface BodyGetters<T> {
    getProjectKey(body: T): string;
    getFullKey(body: T): string;
    /**
     * Иванов Иван Иванович
     */
    getDisplayName(body: T): string;
    /**
     * ii_ivanov
     */
    getUserId(body: T): string;
    getIssueId(body: T): number;
    getIssueName(body: T): string;
    getSummary(body: T): string;
    getMembers(body: T): string[];
    getDescriptionFields(body: T): DescriptionFields | undefined;
    getIssueChanges(body: T): IssueChanges[] | undefined;
}

interface CommentGetters<T> extends BodyGetters<T> {
    getCommentBody(
        body: T,
    ): {
        id: number;
        body: string;
    };
}

const missField = translate('miss');

const handlers: { issue: BodyGetters<GitlabIssueHook>; note: CommentGetters<GitlabCommentHook> } = {
    issue: {
        getProjectKey: body => body.project.path_with_namespace,
        getFullKey: body => transformToKey(body.project.path_with_namespace, body.object_attributes.iid),
        getDisplayName: body => body.user.name,
        getUserId: body => body.user.username,
        getIssueId: body => body.object_attributes.iid,
        getIssueName: body => body.object_attributes.title,
        getSummary: body => body.object_attributes.title,
        getMembers: body => [...body.assignees.map(el => el.name), body.user.name],
        getDescriptionFields: () => undefined,
        getIssueChanges: (body): any => {
            return Object.entries(body.changes)

                .filter(([el]) => !el.includes('_'))
                .map(([field, value]) => {
                    switch (field) {
                        case 'assignees':
                            return { field, newValue: value.current[0]?.name };
                        case 'labels':
                            return { field, newValue: value.current[0]?.title };
                        default:
                            return { field, newValue: value.current };
                    }
                });
        },
    },
    note: {
        getIssueChanges: () => undefined,
        getFullKey: body => transformToKey(body.project.path_with_namespace, body.issue.iid),
        getProjectKey: body => body.project.path_with_namespace,
        getDisplayName: body => body.user.name,
        getUserId: body => body.user.username,
        getCommentBody: body => ({
            id: body.object_attributes.id,
            body: body.object_attributes.note,
        }),
        getIssueId: body => body.issue.iid,
        getIssueName: body => body.issue.title,
        getSummary: body => body.issue.title,
        // Return undefined because there is no way to get expected issue fields by comment hook
        getDescriptionFields: () => undefined,
        getMembers: body => [body.user.name],
    },
};

const issueRequestHandlers: BodyGetters<GitlabIssue> = {
    getIssueChanges: () => undefined,
    getMembers: body => [body.author.username, body.assignee?.username].filter(Boolean) as string[],
    getUserId: body => body.author.username,
    getDisplayName: body => body.author.name,
    getIssueId: body => body.iid,
    getProjectKey: body => {
        const [projectKey] = body.references.full.split('#');

        return projectKey;
    },
    getFullKey: body => transformToKey(issueRequestHandlers.getProjectKey(body), body.iid),
    getIssueName: body => body.title,
    getSummary: body => body.title,
    getDescriptionFields: body => ({
        assigneeName: body.assignee?.name || missField,
        description: body.description,
        epicLink: missField,
        estimateTime: missField,
        priority: missField,
        reporterName: issueRequestHandlers.getDisplayName(body),
        typeName: missField,
    }),
};

const getBodyWebhookEvent = (body: any): string | undefined => body?.object_kind;

const getHandler = (body): typeof issueRequestHandlers | typeof handlers.issue | typeof handlers.note | undefined => {
    const type = getBodyWebhookEvent(body);

    return (type && handlers[type]) || issueRequestHandlers;
};

const isIgnoreHookType = (body): boolean => {
    const type = getBodyWebhookEvent(body);

    return !Boolean(type && handlers[type]);
};

const runMethod = (body: any, method: string): any => {
    const handler = getHandler(body);

    return handler && handler[method] && handler[method](body);
};

const getHeaderText = body => {
    const fullName = handlers.note.getDisplayName(body);
    const userId = handlers.note.getUserId(body);
    const name = `${fullName} ${userId}`;

    return translate('comment_created', { name });
};

const getIssueMembers = body => issueRequestHandlers.getMembers(body);

const getMembers = body => runMethod(body, 'getMembers') || getIssueMembers(body);

const isCommentEvent = body => getBodyWebhookEvent(body) === HookTypes.Comment;

const getTypeEvent = body => body?.object_attributes?.action;

const getIssueCreator = (body: GitlabIssue) => body?.author?.username;

const getDisplayName = body => runMethod(body, 'getDisplayName');

const isCorrectWebhook = (body: any, hookName: any): boolean =>
    getBodyWebhookEvent(body) === hookName || getTypeEvent(body) === hookName;

const getProjectKey = body => runMethod(body, 'getProjectKey') || issueRequestHandlers.getProjectKey(body);

const getBodyTimestamp = body => {
    const time: string = body?.object_attributes?.updated_at || body?.object_attributes?.created_at;

    return new Date(time).getTime() || time.split(' ').join();
};

const getRedisKey = (funcName: string, body: any): string => [funcName, getBodyTimestamp(body)].join('_');

const getIssueId = body => runMethod(body, 'getIssueId') || issueRequestHandlers.getIssueId(body);

const getIssueKey = body => runMethod(body, 'getFullKey') || issueRequestHandlers.getFullKey(body);

const getIssueName = body => runMethod(body, 'getIssueName') || issueRequestHandlers.getIssueName(body);

const getSummary = body => runMethod(body, 'getSummary') || issueRequestHandlers.getSummary(body);

const getDescriptionFields = (body): DescriptionFields => runMethod(body, 'getDescriptionFields');

const getCreator = body => runMethod(body, 'getUserId');

const getIssueChanges = body => runMethod(body, 'getIssueChanges');

const composeRoomName = (key, summary) => {
    const data = transformFromKey(key);

    return '#' + data.issueId + ' ' + summary + ' ' + key;
};

export const selectors: GitlabSelectors = {
    transformFromKey,
    composeRoomName,
    getIssueChanges,
    getCreator,
    transformToKey,
    getBodyTimestamp,
    getHeaderText,
    isCommentEvent,
    getBodyWebhookEvent,
    getTypeEvent,
    getIssueCreator,
    getDisplayName,
    getMembers,
    getIssueMembers,
    isCorrectWebhook,
    getCommentBody: handlers.note.getCommentBody,
    getProjectKey,
    getHookType: getBodyWebhookEvent,
    getRedisKey,
    getIssueId,
    getIssueKey,
    getKey: getIssueKey,
    getIssueName,
    getSummary,
    getDescriptionFields,
    isIgnoreHookType,
};