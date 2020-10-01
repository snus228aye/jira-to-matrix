import {
    Parser,
    Config,
    CreateRoomData,
    PostCommentData,
    InviteNewMembersData,
    PostIssueUpdatesData,
    UploadData,
    RoomViewStateEnum,
    PushCommitData,
    ActionNames,
    PostPipelineData,
    PostMilestoneUpdatesData,
    MilestoneUpdateStatus,
} from '../../types';
import {
    GitlabSelectors,
    HookTypes,
    GitlabPushHook,
    GitlabPipelineHook,
    PipelineBuild,
    GitlabPipeline,
    SuccessStatus,
    SuccessAttributes,
} from './types';
import Lo from 'lodash/fp';

export class GitlabParser implements Parser {
    issueMovedType = 'issueMovedType';

    constructor(private features: Config['features'], private selectors: GitlabSelectors) {}

    isPostPipeline(body: any) {
        return Boolean(this.features.postIssueUpdates && this.selectors.isPipelineHook(body));
    }

    private isSuccessAttributes = (baseAtributes: {
        url: string;
        status: string;
        ref: string;
    }): baseAtributes is SuccessAttributes => {
        const successStatuses: SuccessStatus[] = ['manual', 'success'];

        return successStatuses.some(el => el === baseAtributes.status);
    };

    private getPipelineData = (body: GitlabPipelineHook): GitlabPipeline => {
        const groupedBuilds = Lo.pipe(
            Lo.path('builds'),
            Lo.groupBy('stage'),
            Lo.mapValues(Lo.map((el: PipelineBuild) => ({ [el.name]: el.status }))),
        )(body);

        const baseAtributes = {
            url: body.project.web_url + '/pipelines/' + body.object_attributes.id,
            status: body.object_attributes.status,
            ref: body.object_attributes.ref,
        };

        if (this.isSuccessAttributes(baseAtributes)) {
            return {
                object_kind: HookTypes.Pipeline,
                object_attributes: baseAtributes,
            };
        }

        return {
            object_kind: HookTypes.Pipeline,
            object_attributes: {
                ...baseAtributes,
                username: body.user.username,
                created_at: body.object_attributes.created_at,
                duration: body.object_attributes.duration,
                sha: body.object_attributes.sha,
                tag: body.object_attributes.tag,
                stages: body.object_attributes.stages.map(el => ({ [el]: groupedBuilds[el] })) as any,
            },
        };
    };

    getPostPipelineData(body: GitlabPipelineHook): PostPipelineData {
        return {
            author: this.selectors.getFullNameWithId(body),
            issueKeys: this.selectors.getPostKeys(body),
            pipelineData: this.getPipelineData(body),
        };
    }

    isPostPushCommit(body) {
        return Boolean(this.features.postIssueUpdates && this.selectors.isCorrectWebhook(body, HookTypes.Push));
    }

    getPostPushCommitData(body: GitlabPushHook): PushCommitData {
        const author = this.selectors.getFullNameWithId(body);
        const keyAndCommits = this.selectors.getCommitKeysBody(body);

        return {
            author,
            keyAndCommits,
        };
    }

    isPostIssueUpdates(body) {
        return Boolean(
            (this.features.postIssueUpdates &&
                this.selectors.getIssueChanges(body) &&
                this.selectors.isCorrectWebhook(body, 'update')) ||
                this.selectors.isCorrectWebhook(body, 'close') ||
                this.selectors.isCorrectWebhook(body, 'reopen'),
        );
    }

    getPostIssueUpdatesData(body): PostIssueUpdatesData {
        const author = this.selectors.getDisplayName(body)!;
        const changes = this.selectors.getIssueChanges(body)!;
        const hookLabels = this.selectors.getIssueLabels(body);
        const newTitleData = changes.find(data => data.field === 'title');
        const newMilestone = changes.find(data => data.field === 'milestone_id');
        const oldKey = this.selectors.getIssueKey(body);
        let newRoomName: string | undefined;

        if (newMilestone) {
            newRoomName = this.selectors.composeRoomName(oldKey, {
                summary: this.selectors.getSummary(body)!,
                milestone: newMilestone.newValue,
            });
        }
        if (newTitleData) {
            newRoomName = this.selectors.composeRoomName(oldKey, {
                summary: newTitleData.newValue,
            });
        }
        if (this.selectors.isCorrectWebhook(body, 'close')) {
            newRoomName = this.selectors.composeRoomName(oldKey, {
                summary: this.selectors.getSummary(body)!,
                state: RoomViewStateEnum.close,
            });
        }
        if (this.selectors.isCorrectWebhook(body, 'reopen')) {
            newRoomName = this.selectors.composeRoomName(oldKey, {
                summary: this.selectors.getSummary(body)!,
                state: RoomViewStateEnum.open,
            });
        }
        const isNewStatus = Boolean(changes.find(data => data.field === 'labels' || data.field === 'status'));

        const projectKey = this.selectors.getProjectKey(body)!;

        return { oldKey, changes, author, projectKey, newRoomName, hookLabels, isNewStatus };
    }

    isCreateRoom(body) {
        return Boolean(
            this.features.createRoom &&
                !this.selectors.isCorrectWebhook(body, HookTypes.Push) &&
                !this.selectors.isCorrectWebhook(body, HookTypes.Pipeline) &&
                this.selectors.getKey(body),
            // TODO not found webhook for issue moved to another project
            // && this.selectors.getTypeEvent(body) !== this.issueMovedType,
        );
    }

    getCreateRoomData(body): CreateRoomData {
        const projectKey = this.selectors.getProjectKey(body);
        const summary = this.selectors.getSummary(body);
        const key = this.selectors.getIssueKey(body);
        const hookLabels = this.selectors.getIssueLabels(body);
        const descriptionFields = this.selectors.getDescriptionFields(body);
        const milestoneId = this.selectors.getMilestoneId(body) || undefined;

        const parsedIssue = { key, summary, projectKey, descriptionFields, hookLabels };

        return {
            issue: parsedIssue,
            projectKey: this.features.createProjectRoom ? projectKey : undefined,
            milestoneId,
        };
    }

    getPostCommentData(body): PostCommentData {
        const headerText = this.selectors.getHeaderText(body)!;
        const author = this.selectors.getDisplayName(body)!;
        const issueId = this.selectors.getIssueKey(body);
        const comment = this.selectors.getCommentBody(body);

        return { issueId, headerText, comment, author };
    }

    isPostComment(body) {
        return Boolean(
            this.features.postComments && this.selectors.isCommentEvent(body) && !this.selectors.isUploadBody(body),
        );
    }

    isPostMilestoneUpdates(body) {
        const isMilestoneIssue =
            this.selectors.getMilestoneId(body) ||
            this.selectors.getIssueChanges(body)?.some(el => el.field === 'milestone_id');

        return Boolean(this.features.postMilestoneUpdates && isMilestoneIssue);
    }

    getPostMilestoneUpdatesData(body): PostMilestoneUpdatesData {
        // TODO milestone add deleting from removed milestone
        // const isMilestoneUpdated = data => {
        //     const changes = this.selectors.getIssueChanges(data);
        //     if (changes) {
        //         const newMilestone = changes.find(el => el.field === 'milestone_id');

        //         const res = newMilestone && !newMilestone.newValue;

        //         return Boolean(res);
        //     }

        //     return false;
        // };

        const isMilestoneDeleted = data => {
            const changes = this.selectors.getIssueChanges(data);
            if (changes) {
                const newMilestone = changes.find(el => el.field === 'milestone_id');

                const res = newMilestone && !newMilestone.newValue;

                return Boolean(res);
            }

            return false;
        };

        const status = Lo.cond([
            [isMilestoneDeleted, Lo.always(MilestoneUpdateStatus.Deleted)],
            [el => this.selectors.isCorrectWebhook(el, 'close'), Lo.always(MilestoneUpdateStatus.Closed)],
            [el => this.selectors.isCorrectWebhook(el, 'reopen'), Lo.always(MilestoneUpdateStatus.Reopen)],
            [Lo.T, Lo.always(MilestoneUpdateStatus.Created)],
        ])(body);

        return {
            issueKey: this.selectors.getIssueKey(body),
            milestoneId:
                status === MilestoneUpdateStatus.Deleted
                    ? body?.changes?.milestone_id?.previous
                    : this.selectors.getMilestoneId(body)!,
            summary: this.selectors.getSummary(body)!,
            user: this.selectors.getDisplayName(body)!,
            status,
        };
    }

    getInviteNewMembersData(body): InviteNewMembersData {
        const key = this.selectors.getIssueKey(body);
        const descriptionFields = this.selectors.getDescriptionFields(body);
        const projectKey = this.selectors.getProjectKey(body);

        return { key, typeName: descriptionFields?.typeName, projectKey };
    }

    getUploadData(body): UploadData {
        return {
            uploadInfo: this.selectors.getUploadInfo(body)!,
            issueKey: this.selectors.getIssueKey(body),
            uploadUrls: this.selectors.getUploadUrl(body)!,
        };
    }

    isMemberInvite(body) {
        return (
            this.features.inviteNewMembers &&
            (this.selectors.isCorrectWebhook(body, 'update') || this.selectors.isCorrectWebhook(body, 'reopen'))
        );
    }

    isUpload(body) {
        return this.features.postComments && this.selectors.isCommentEvent(body) && this.selectors.isUploadBody(body);
    }

    actionFuncs = {
        [ActionNames.PostComment]: this.isPostComment,
        [ActionNames.InviteNewMembers]: this.isMemberInvite,
        [ActionNames.PostIssueUpdates]: this.isPostIssueUpdates,
        [ActionNames.Upload]: this.isUpload,
        [ActionNames.PostCommit]: this.isPostPushCommit,
        [ActionNames.Pipeline]: this.isPostPipeline,
        [ActionNames.PostMilestoneUpdates]: this.isPostMilestoneUpdates,
    };

    getBotActions(body) {
        return Object.keys(this.actionFuncs).filter(key => this.actionFuncs[key].bind(this)(body));
    }
}
