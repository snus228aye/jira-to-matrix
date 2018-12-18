const logger = require('../modules/log.js')(module);
const redis = require('../redis-client.js');
const {getLinkedIssue} = require('../lib/jira-request.js');
const {getPostLinkMessageBody} = require('./helper');
const {getRelations, getKey} = require('../lib/utils');

const postLink = async (key, relations, mclient) => {
    const roomID = await mclient.getRoomId(key);

    const {body, htmlBody} = getPostLinkMessageBody(relations);
    await mclient.sendHtmlMessage(roomID, body, htmlBody);
};

const handleLink = mclient => async issueLinkId => {
    try {
        const isNew = await redis.setnxAsync(`link|${issueLinkId}`, '1');

        if (!isNew) {
            logger.debug(`link ${issueLinkId} is already been posted to room`);
            return;
        }

        const link = await getLinkedIssue(issueLinkId);
        const {inward, outward} = getRelations(link);

        await postLink(getKey(link.inwardIssue), inward, mclient);
        await postLink(getKey(link.outwardIssue), outward, mclient);
        logger.debug(`Issue link ${issueLinkId} is successfully posted!`);
    } catch (err) {
        throw ['HandleLink error in post link', err].join('\n');
    }
};

module.exports = async ({mclient, links}) => {
    try {
        await Promise.all(links.map(handleLink(mclient)));
        return true;
    } catch (err) {
        throw ['Error in postNewLinks', err].join('\n');
    }
};
