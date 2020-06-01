import { BaseChatApi } from '../messengers/base-api';
import { Changelog } from '../task-trackers/jira/types';

export interface ChangelogItem {
    field: string;
    fieldtype: string;
    fieldId: string;
    from: null | string;
    fromString: null | string;
    to: null | string;
    toString: string;
}

export interface Config {
    port: string;
    lang: 'en' | 'ru';
    pathToDocs: string;
    jira: {
        url: string;
        user: string;
        password: string;
    };
    features: {
        createRoom: boolean;
        inviteNewMembers: boolean;
        postComments: boolean;
        postIssueUpdates: boolean;
        epicUpdates: {
            newIssuesInEpic: 'on' | 'off';
            issuesStatusChanged: 'on' | 'off';
            field: string;
            fieldAlias: string;
            on: () => boolean;
        };
        newLinks: boolean;
        postChangesToLinks: {
            on: boolean;
            ignoreDestStatusCat: number[];
        };
    };
    usersToIgnore: string[];
    inviteIgnoreUsers: string[];
    testMode: {
        on: boolean;
        users: string[];
    };
    redis: {
        host: string;
        port: number;
        prefix: string;
    };
    messenger: {
        admins: string[];
        name: 'matrix' | 'slack';
        domain: string;
        user: string;
        password: string;
        // slack only
        eventPort?: number;
        bots: {
            user: string;
            password: string;
            isMaster?: true;
        }[];
        infoRoom?: {
            users?: string[];
            name: string;
        };
    };
    log: {
        type: string;
        filePath: string;
        fileLevel: string;
        consoleLevel: string;
    };
    ping: {
        interval: number;
        count: number;
    };
    colors: {
        //
        links: {
            issue: string;
            green: string;
            yellow: string;
            'blue-gray': string;
            purple: string;
        };
        projects: string[] | 'all';
    };
    gitArchive?: {
        user: string;
        password: string;
        repoPrefix: string;
        protocol: 'http' | 'https';
        options?: {
            lastIssue: string[];
        };
    };
    baseDir: string;
    // delay interval for archiving rooms and other high loadly chat server operations
    delayInterval: number;
    baseRemote?: string;
    baseLink?: string;
    sshLink?: string;
    gitReposPath?: string;
    ignoreCommands: string[];
}

export interface ChatConfig extends Config {
    user: string;
    password: string;
    isMaster?: true;
}

export interface Comment {
    self: string;
    id: string;
    author: {
        self: string;
        accountId: string;
        avatarUrls: {
            '48x48': string;
            '24x24': string;
            '16x16': string;
            '32x32': string;
        };
        displayName: string;
        active: boolean;
        timeZone: string;
    };
    body: string;
    updateAuthor: {
        self: string;
        accountId: string;
        avatarUrls: {
            '48x48': string;
            '24x24': string;
            '16x16': string;
            '32x32': string;
        };
        displayName: string;
        active: boolean;
        timeZone: string;
    };
    created: string;
    updated: string;
    jsdPublic: boolean;
}

export interface IssueLink {
    id: string;
    self: string;
    type: {
        id: string;
        name: string;
        inward: string;
        outward: string;
        self: string;
    };
    outwardIssue: {
        id: string;
        key: string;
        self: string;
        fields: {
            summary: string;
            status: {
                self: string;
                description: string;
                iconUrl: string;
                name: string;
                id: string;
                statusCategory: {
                    self: string;
                    id: 2;
                    key: string;
                    colorName: string;
                    name: string;
                };
            };
            priority: {
                self: string;
                iconUrl: string;
                name: string;
                id: string;
            };
            issuetype: {
                self: string;
                id: string;
                description: string;
                iconUrl: string;
                name: string;
                subtask: false;
                avatarId: number;
            };
        };
    };
}

export interface Issue {
    expand: string;
    id: string;
    self: string;
    key: string;
    fields: {
        issuetype: {
            self: string;
            id: string;
            description: string;
            iconUrl: string;
            name: string;
            subtask: false;
            avatarId: number;
        };
        timespent: null;
        customfield_10030: null;
        project: {
            self: string;
            id: string;
            key: string;
            name: string;
            projectTypeKey: string;
            avatarUrls: {
                '48x48': string;
                '24x24': string;
                '16x16': string;
                '32x32': string;
            };
        };
        fixVersions: [];
        aggregatetimespent: null;
        resolution: null;
        resolutiondate: null;
        workratio: -1;
        watches: {
            self: string;
            watchCount: 1;
            isWatching: false;
        };
        lastViewed: null;
        created: string;
        customfield_10020: null;
        customfield_10021: [];
        priority: {
            self: string;
            iconUrl: string;
            name: string;
            id: string;
        };
        customfield_10025: null;
        labels: [];
        customfield_10026: null;
        customfield_10016: null;
        customfield_10017: null;
        customfield_10018: null;
        customfield_10019: string;
        aggregatetimeoriginalestimate: null;
        timeestimate: null;
        versions: [];
        issuelinks: IssueLink[];
        assignee: {
            self: string;
            accountId: string;
            avatarUrls: {
                '48x48': string;
                '24x24': string;
                '16x16': string;
                '32x32': string;
            };
            displayName: string;
            active: boolean;
            timeZone: string;
        };
        updated: string;
        status: {
            self: string;
            description: string;
            iconUrl: string;
            name: string;
            id: string;
            statusCategory: {
                self: string;
                id: 2;
                key: string;
                colorName: string;
                name: string;
            };
        };
        components: [];
        timeoriginalestimate: null;
        description: string;
        customfield_10055: null;
        customfield_10056: null;
        customfield_10057: null;
        customfield_10013: null;
        customfield_10014: null;
        customfield_10058: null;
        customfield_10015: {
            hasEpicLinkFieldDependency: false;
            showField: false;
            nonEditableReason: {
                reason: string;
                message: string;
            };
        };
        timetracking: {};
        customfield_10005: null;
        customfield_10006: null;
        security: null;
        customfield_10007: null;
        customfield_10008: null;
        customfield_10009: null;
        aggregatetimeestimate: null;
        attachment: [];
        summary: string;
        creator: {
            self: string;
            accountId: string;
            avatarUrls: {
                '48x48': string;
                '24x24': string;
                '16x16': string;
                '32x32': string;
            };
            displayName: string;
            active: boolean;
            timeZone: string;
        };
        subtasks: [];
        customfield_10040: null;
        customfield_10041: null;
        reporter: {
            self: string;
            accountId: string;
            avatarUrls: {
                '48x48': string;
                '24x24': string;
                '16x16': string;
                '32x32': string;
            };
            displayName: string;
            active: boolean;
            timeZone: string;
        };
        aggregateprogress: {
            progress: number;
            total: number;
        };
        customfield_10000: string;
        customfield_10001: null;
        customfield_10002: null;
        customfield_10003: null;
        customfield_10004: null;
        customfield_10039: null;
        environment: null;
        duedate: null;
        progress: {
            progress: number;
            total: number;
        };
        votes: {
            self: string;
            votes: number;
            hasVoted: false;
        };
        comment: {
            comments: Comment[];
            maxResults: number;
            total: number;
            startAt: number;
        };
        worklog: {
            startAt: number;
            maxResults: number;
            total: number;
            worklogs: [];
        };
    };
}

export interface Transition {
    id: string;
    name: string;
    to: {
        self: string;
        description: string;
        iconUrl: string;
        name: string;
        id: string;
        statusCategory: {
            self: string;
            id: 1;
            key: string;
            colorName: string;
            name: string;
        };
    };
    hasScreen: false;
    isGlobal: false;
    isInitial: false;
    isConditional: false;
    fields: {
        summary: {
            required: false;
            schema: {
                type: string;
                items: string;
                custom: string;
                customId: 10001;
            };
            name: string;
            key: string;
            hasDefaultValue: false;
            operations: string[];
            allowedValues: string[];
            defaultValue: string;
        };
    };
}

export interface RenderedIssue extends Issue {
    renderedFields: {
        issuetype: string | null;
        timespent: string | null;
        customfield_10030: string | null;
        project: string | null;
        fixVersions: string | null;
        aggregatetimespent: string | null;
        resolution: string | null;
        resolutiondate: string | null;
        workratio: string | null;
        lastViewed: string;
        watches: string | null;
        created: string;
        customfield_10020: string | null;
        customfield_10021: string | null;
        priority: string | null;
        customfield_10025: string | null;
        labels: string | null;
        customfield_10026: string | null;
        customfield_10016: string | null;
        customfield_10017: string | null;
        customfield_10018: string | null;
        customfield_10019: string | null;
        aggregatetimeoriginalestimate: string | null;
        timeestimate: string | null;
        versions: string | null;
        issuelinks: string | null;
        assignee: string | null;
        updated: string;
        status: string | null;
        components: string | null;
        timeoriginalestimate: string | null;
        description: string;
        customfield_10055: string;
        customfield_10056: string | null;
        customfield_10013: string | null;
        customfield_10057: string | null;
        customfield_10058: string | null;
        customfield_10014: string | null;
        timetracking: {};
        customfield_10015: string | null;
        customfield_10005: string;
        customfield_10006: string | null;
        security: string | null;
        customfield_10007: string | null;
        customfield_10008: string | null;
        attachment: [];
        customfield_10009: string | null;
        aggregatetimeestimate: string | null;
        summary: string | null;
        creator: string | null;
        subtasks: string | null;
        customfield_10040: string;
        customfield_10041: string;
        reporter: string | null;
        customfield_10000: string | null;
        aggregateprogress: string | null;
        customfield_10001: string | null;
        customfield_10002: string | null;
        customfield_10003: string | null;
        customfield_10004: string | null;
        customfield_10039: string;
        environment: string;
        duedate: string | null;
        progress: string | null;
        votes: string | null;
    };
}

export interface Project {
    key: string;
    id: string;
    name: string;
    lead: string;
    issueTypes: Array<{ id: string; name: string; description: string; subtask: any }>;
    adminsURL: string;
    isIgnore: boolean;
    style: string;
    admins?: string[];
}

export interface Relation {
    relation: any;
    related: any;
}

export interface DescriptionFields {
    assigneeName: string;
    reporterName: string;
    typeName: string;
    epicLink: string;
    estimateTime: string;
    description: string;
    priority: string;
}

export interface Selectors {
    getBodyWebhookEvent(body): string | undefined;

    getResponcedSummary(body): string | undefined;

    getTypeEvent(body): string | undefined;

    getIssueCreator(body): string | undefined;

    getIssueAssignee(body): string | undefined;

    getIssueMembers(body): string[];

    getHookType(body): string | undefined;

    getHandler(body): string | undefined;

    runMethod(body: any, method: string): string | undefined;

    getDisplayName(body): string | undefined;

    getMembers(body): string | undefined;

    getIssueId<Issue>(body): string;
    getIssueId<T>(body: T): string | undefined;

    getIssueKey(body): string;

    getIssueName(body): string | undefined;

    getCreatorDisplayName(body): string | undefined;

    getProjectKey(body, type: 'issue'): string;
    getProjectKey(body, type?: 'issue'): string | undefined;

    getLinks(body): IssueLink[];

    getChangelog(body): Changelog | undefined;

    getCommentAuthor(body): string | undefined;

    getComment(body): string | undefined;

    getCommentBody(body): { body: string; id: string };

    getUserName(body): string | undefined;

    getEpicKey(body): string | undefined;

    getKey(body): string | undefined;

    getIssueLinkSourceId(body): string | undefined;

    getIssueLinkDestinationId(body): string | undefined;

    getNameIssueLinkType(body): string | undefined;

    getSourceRelation(body): string | undefined;

    getDestinationRelation(body): string | undefined;

    getSummary(body): string | undefined;

    getBodyTimestamp(body): number | undefined;

    getRedisKey(funcName: string, body: any): string;

    getHookUserName(body): string | undefined;

    getChangelogItems(body): ChangelogItem[];

    isCorrectWebhook(body: any, hookName: any): boolean;

    isEpic(body): boolean;

    isCommentEvent(body): boolean;

    getChangelogField(fieldName: string, body: any);

    getNewSummary(body): string | undefined;

    getNewStatus(body): string | undefined;

    getNewStatusId(body): string | undefined;

    getNewKey(body): string | undefined;

    getOldKey(body): string | undefined;

    getRelations(body): { inward: Relation; outward: Relation };

    getTextIssue(body: any, path: string): string;

    getDescriptionFields(body): DescriptionFields;

    getHeaderText(body): string | undefined;

    getLinkKeys(body): string[];

    getInwardLinkKey(body): string | undefined;

    getOutwardLinkKey(body): string | undefined;
}

export interface TaskTracker {
    selectors: Selectors;

    parser: Parser;

    request(url: string, newOptions: any): Promise<any>;

    requestPost(url: string, body: any): Promise<any>;

    requestPut(url: string, body: any): Promise<any>;

    postComment(keyOrId: string, sender: string, bodyText: string): Promise<any>;

    /**
     * Set issue to special transition
     */
    postIssueStatus(keyOrId: string, id: string): Promise<void>;

    /**
     * Get all issue transitions
     */
    getPossibleIssueStatuses(keyOrId: string): Promise<object[]>;

    /**
     * Get all issue priorities
     */
    getIssuePriorities(keyOrId: string): Promise<object[] | undefined>;

    /**
     * Update issue priorities
     */
    updateIssuePriority(keyOrId: string, priorityId: string): Promise<void>;

    /**
     * Ping tasktracker
     */
    testJiraRequest(): Promise<void>;

    /**
     * Make jira request to get all watchers, assign, creator and reporter of issue from url
     */
    getIssueWatchers(keyOrId: string): Promise<string[]>;

    /**
     * Make GET request to jira by ID to get linked issues
     */
    getLinkedIssue(id: string): Promise<Issue>;

    /**
     * Make GET request to jira by issueID and params
     */
    getIssue(keyOrId: string, params?: object): Promise<Issue>;

    /**
     * Create issue
     */
    createIssue(data: {
        summary: string;
        issueTypeId: string;
        projectId: string;
        parentId: string;
        isEpic: boolean;
        isSubtask: boolean;
        styleProject: string;
    }): Promise<Issue>;

    /**
     * Create link with issue
     */
    createEpicLinkClassic(issueKey: string, parentId: string): Promise<void>;

    /**
     * Create issue link
     */
    createIssueLink(issueKey1: string, issueKey2: string): Promise<void>;

    /**
     * Make GET request to jira by project id or key
     */
    getProject(
        keyOrId: string,
    ): Promise<{
        key: string;
        id: string;
        name: string;
        lead: string;
        issueTypes: Array<{ id: string; name: string; description: string; subtask: any }>;
        adminsURL: string;
        isIgnore: boolean;
        style: string;
    }>;

    /**
     * Check if project with such key or id exists
     */
    isJiraPartExists(keyOrId: string): Promise<boolean>;

    /**
     * Make GET request to jira by projectID
     */
    getProjectWithAdmins(projectKey: string): Promise<Project>;

    /**
     * Make request to jira by issueID adding renderedFields
     */
    getIssueFormatted(issueID: string): Promise<RenderedIssue>;

    /**
     * Make request to jira by issueID adding renderedFields and filter by fields
     */
    getRenderedValues(key: string, fields: string[]): Promise<any>;

    /**
     * Get user list by part of the name
     */
    searchUser(partName?: string): Promise<{ displayName: string; accountId: string }[]>;

    /**
     * Add watcher to issue
     */
    addWatcher(accountId: string, keyOrId: string): Promise<void>;

    /**
     * Add assign to issue
     */
    addAssignee(accountId: string, keyOrId: string): Promise<void>;

    /**
     * Get issue without throw on error
     */
    getIssueSafety(keyOrId: string): Promise<Issue | boolean>;

    /**
     * Check if issue exists
     */
    hasIssue(keyOrId: string): Promise<boolean>;

    /**
     * Get status data with color
     */
    getStatusData(statusId: string): Promise<{ colorName: string | undefined } | undefined>;

    /**
     * Get last created issue key in project
     */
    getLastIssueKey(projectKey: string): Promise<string | undefined>;

    /**
     * Check if status exists in project
     */
    hasStatusInProject(projectKey: string, status: string): Promise<boolean>;

    /**
     * Get issue current status
     */
    getCurrentStatus(keyOrId: string): Promise<string | undefined>;

    /**
     * Get url for rest api
     */
    getRestUrl(...args: string[]): string;

    /**
     * Get link to view in browser
     */
    getViewUrl(key: string, type?: string): string;
}

interface CommonMessengerApi {
    /**
     * Transform ldap user name to chat user id
     */
    getChatUserId(shortName: string): string;

    /**
     * Get room id by name
     */
    getRoomIdByName(name: string, notUpper?: boolean): Promise<string | false>;

    /**
     * Set new topic for matrix room
     */
    setRoomTopic(roomId: string, topic: string): Promise<void>;

    /**
     *  disconnected Chat client
     */
    disconnect(): void;

    /**
     */
    getRoomId(name: string): Promise<string>;

    /**
     */
    getRoomMembers(data: { name: string; roomId?: string }): Promise<string[]>;

    /**
     * Invite user to chat room
     */
    invite(roomId: string, userId: string): Promise<boolean>;

    /**
     * Send message to chat room
     */
    sendHtmlMessage(roomId: string, body: string, htmlBody: string): Promise<void>;

    /**
     * Update room name
     */
    updateRoomName(roomId: string, roomData: { key: string; summary: string }): Promise<void>;

    /**
     * Update room info data
     */
    updateRoomData(roomId: string, topic: string, key: string): Promise<void>;

    /**
     * Get bot which joined to room in chat
     */
    setRoomAvatar(roomId: string, url: string): Promise<true | undefined>;

    /**
     * Get chat id by displayName
     */
    getUserIdByDisplayName(name: string): Promise<any>;

    /**
     * Kick bot from a roon
     */
    kickUserByRoom(data: { roomId: string; userId: string }): Promise<string | undefined>;

    /**
     * Get all room events
     */
    getAllEventsFromRoom(roomId: string, limit?: number): Promise<any[] | undefined>;

    /**
     * Get room id, throws if no bot is in room
     */
    getRoomDataById(roomId: string): Promise<RoomData | undefined>;
}

export interface MessengerApi extends CommonMessengerApi, BaseChatApi {
    /**
     * Get link to download media
     */
    getDownloadLink(chatLink: string): string;

    /**
     * Delete matrix room alias
     * @param {string} aliasPart matrix room id
     */
    deleteRoomAlias(aliasPart: string): Promise<string | void>;

    /**
     * @param {string} roomId room id
     */
    setRoomJoinedByUrl(roomId: string): Promise<true | undefined>;

    /**
     * Get bot which joined to room in chat
     */
    getUser(userId: string): Promise<{ displayName: string; avatarUrl: string } | undefined>;

    /**
     * Join Room
     */
    joinRoom(data: { roomId?: string; aliasPart: string }): Promise<void>;

    /**
     * Get matrix room by alias
     */
    getRoomAdmins(data: { name?: string; roomId?: string }): Promise<{ name: string; userId: string }[]>;

    /**
     * Get all messeges from room
     */
    getAllMessagesFromRoom(
        roomId: string,
    ): Promise<{ author: string; date: string; body: string; eventId: string }[] | undefined>;

    /**
     * Set new name for chat room
     */
    setRoomName(roomId: string, name: string): Promise<boolean>;

    /**
     * Create room name for chat
     */
    composeRoomName(key: string, summary: string): string;

    connect(): Promise<void>;

    isConnected(): boolean;

    /**
     * Set power level for current user in chat room
     */
    setPower(roomId: string, userId: string): Promise<boolean>;

    /**
     * Create chat room
     */
    createRoom(options: {
        room_alias_name: string;
        invite: string[];
        name: string;
        topic?: string;
        purpose?: string;
        avatarUrl?: string;
    }): Promise<string>;

    /**
     * Check if user is in room
     */
    isInRoom(roomId: string): Promise<boolean>;

    leaveRoom(roomId: string): Promise<string | false>;

    getRooms(): Array<any>;

    /**
     * Check if user is in matrix room
     */
    isRoomMember(roomId: string, user: string): Promise<boolean>;
}

export interface RoomData {
    id: string;
    alias: string | string | null;
    name: string;
    topic?: string;
    members: {
        userId: string;
        powerLevel: number;
    }[];
}

export interface CreateRoomData {
    issue: {
        key: string;
        id?: string;
        summary?: string;
        projectKey?: string;
        descriptionFields?: DescriptionFields;
    };
    projectKey?: string;
}

export interface InviteNewMembersData {
    issue: { key: string; typeName: string; projectKey: string };
    projectKey?: string;
}

export interface PostIssueUpdatesData {
    newStatusId?: string;
    oldKey: string;
    newKey?: string;
    newNameData?: { key: string; summary: string };
    changelog: Changelog;
    author: string;
    projectKey?: string;
}

export interface PostEpicUpdatesData {
    epicKey: string;
    data: { key: string; summary: string; id: string; name: string; status?: string };
}

export interface PostProjectUpdatesData {
    typeEvent: 'issue_created' | 'issue_generic';
    projectKey: string;
    data: {
        summary: string;
        key: string;
        status?: string;
        name?: string;
    };
}

export interface ArchiveProjectData {
    projectKey: string;
    keepTimestamp: string;
    status?: string;
}

export interface PostNewLinksData {
    links: string[];
}

export interface PostCommentData {
    issueID: string;
    headerText: string;
    comment: {
        id: string;
        body: string;
    };
    author: string;
}

export interface PostLinkedChangesData {
    linksKeys: string[];
    data: {
        status?: string;
        key: string;
        summary: string;
        changelog: Changelog;
        name: string;
    };
}

export interface DeletedLinksData {
    sourceIssueId: string;
    destinationIssueId: string;
    sourceRelation: string;
    destinationRelation: string;
}

export interface CommandOptions {
    sender: string;
    roomName: string | null;
    roomId: string;
    bodyText?: string;
    roomData: RoomData;
}

export enum CommandNames {
    Comment = 'comment',
    Assign = 'assign',
    Move = 'move',
    Spec = 'spec',
    Prio = 'prio',
    Op = 'op',
    Invite = 'invite',
    Help = 'help',
    Ignore = 'ignore',
    Create = 'create',
    Autoinvite = 'autoinvite',
    Alive = 'alive',
    GetInfo = 'getInfo',
    Kick = 'kick',
    Archive = 'archive',
    Projectarchive = 'projectarchive',
}

export interface RunCommandsOptions extends CommandOptions {
    chatApi: MessengerApi;
}

export enum ActionNames {
    CreateRoom = 'createRoom',
    InviteNewMembers = 'inviteNewMembers',
    PostComment = 'postComment',
    PostIssueUpdates = 'postIssueUpdates',
    PostEpicUpdates = 'postEpicUpdates',
    PostProjectUpdates = 'postProjectUpdates',
    PostNewLinks = 'postNewLinks',
    PostLinkedChanges = 'postLinkedChanges',
    PostLinksDeleted = 'postLinksDeleted',
    ArchiveProject = 'archiveProject',
}

export interface Parser {
    getPostCommentData(body): PostCommentData;

    getCreateRoomData(body): CreateRoomData;

    getInviteNewMembersData(body): InviteNewMembersData;
    getPostNewLinksData(body): PostNewLinksData;

    getPostEpicUpdatesData(body): PostEpicUpdatesData;

    getPostLinkedChangesData(body): PostLinkedChangesData;

    getPostProjectUpdatesData(body): PostProjectUpdatesData;

    getPostIssueUpdatesData(body): PostIssueUpdatesData;

    getPostLinksDeletedData(body);

    isPostComment(body): boolean;

    isPostIssueUpdates(body): boolean;

    isCreateRoom(body): boolean;

    isMemberInvite(body): boolean;

    isPostEpicUpdates(body): boolean;

    isPostProjectUpdates(body): boolean;

    isPostNewLinks(body): boolean;

    isPostLinkedChanges(body): boolean;

    isDeleteLinks(body): boolean;
}
