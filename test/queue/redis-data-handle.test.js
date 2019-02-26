const nock = require('nock');
const {jira: {url: jiraUrl}} = require('../../src/config');
const {getRestUrl, expandParams} = require('../../src/lib/utils.js');
const JSONbody = require('../fixtures/webhooks/issue/created.json');
const projectBody = require('../fixtures/jira-api-requests/project.json');
const issueBody = require('../fixtures/jira-api-requests/issue-rendered.json');
const getParsedAndSaveToRedis = require('../../src/jira-hook-parser');
const proxyquire = require('proxyquire');
const chai = require('chai');
const {stub} = require('sinon');
const sinonChai = require('sinon-chai');
const {expect} = chai;
chai.use(sinonChai);
const logger = require('../../src/modules/log.js')(module);
const {cleanRedis} = require('../test-utils');

const createRoomStub = stub();
const postEpicUpdatesStub = stub();
const loggerSpy = {
    error: stub(),
    warn: stub(),
    debug: stub(),
    info: stub(),
};

const {
    saveIncoming,
    getRedisKeys,
    getDataFromRedis,
    getRedisRooms,
    handleRedisData,
    handleRedisRooms,
} = proxyquire('../../src/queue/redis-data-handle.js', {
    '../bot/actions': {
        createRoom: createRoomStub,
        postEpicUpdates: postEpicUpdatesStub,
    },
    '../modules/log.js': () => loggerSpy,
});

describe('saveIncoming', () => {
    it('test saveIncoming with no createRoomData args', async () => {
        await saveIncoming({redisKey: 'newrooms'});
        const result = await getRedisRooms();
        expect(result).to.be.null;
    });
});

describe('redis-data-handle test', () => {
    const createRoomData = [{
        issue: {
            key: 'BBCOM-1111',
            id: '30369',
            roomMembers: ['jira_test'],
            summary: 'Test',
            descriptionFields: {
                assigneeName: 'jira_test',
                assigneeEmail: 'jira_test@test-example.ru',
                reporterName: 'jira_test',
                reporterEmail: 'jira_test@test-example.ru',
                typeName: 'Task',
                epicLink: 'BBCOM-801',
                estimateTime: '1h',
                description: 'Info',
                priority: 'Medium',
            },
        },
    }];

    const expectedFuncKeys = [
        'test-jira-hooks:postEpicUpdates_2018-1-11 13:08:04,225',
    ];

    const expectedData = [
        {
            redisKey: 'postEpicUpdates_2018-1-11 13:08:04,225',
            funcName: 'postEpicUpdates',
            data: {
                epicKey: 'BBCOM-801',
                data: {
                    key: 'BBCOM-1398',
                    summary: 'Test',
                    id: '30369',
                    name: 'jira_test',
                },
            },
        },
    ];

    const expectedRoom = [
        {
            issue: {
                key: 'BBCOM-1398',
                id: '30369',
                roomMembers: ['jira_test'],
                summary: 'Test',
                descriptionFields: {
                    assigneeName: 'jira_test',
                    assigneeEmail: 'jira_test@test-example.ru',
                    reporterName: 'jira_test',
                    reporterEmail: 'jira_test@test-example.ru',
                    typeName: 'Task',
                    epicLink: 'BBCOM-801',
                    estimateTime: '1h',
                    description: 'Info',
                    priority: 'Medium',
                },
            },
            projectKey: 'BBCOM',
        },
    ];

    const responce = {
        id: '10002',
        self: 'http://www.example.com/jira/rest/api/2/issue/10002',
        key: 'EpicKey',
        fields: {
            summary: 'SummaryKey',
        },
    };

    // eslint-disable-next-line
    const epicResponse = {
        id: '10002',
        self: 'http://www.example.com/jira/rest/api/2/issue/1000122',
        key: 'EX-1',
        fields: {
            summary: 'SummaryKey',
        },
    };

    const chatApi = {};

    beforeEach(async () => {
        nock(jiraUrl)
            .get('')
            .times(2)
            .reply(200, '<HTML>');

        nock(getRestUrl())
            .get(`/issue/${JSONbody.issue.key}`)
            .reply(200, projectBody)
            .get(`/issue/BBCOM-1398/watchers`)
            .reply(200, {...responce, id: 28516})
            .get(`/issue/30369`)
            .query(expandParams)
            .reply(200, issueBody)
            .get(`/issue/BBCOM-801`)
            .query(expandParams)
            .reply(200, issueBody)
            .get(url => url.indexOf('null') > 0)
            .reply(404);

        await getParsedAndSaveToRedis(JSONbody);
    });


    it('test correct redisKeys', async () => {
        const redisKeys = await getRedisKeys();
        expect(redisKeys).to.have.all.members(expectedFuncKeys);
    });

    it('test correct dataFromRedis', async () => {
        const dataFromRedis = await getDataFromRedis();
        expect(dataFromRedis).to.have.deep.members(expectedData);
    });

    it('test correct handleRedisData', async () => {
        const dataFromRedisBefore = await getDataFromRedis();
        await handleRedisData('client', dataFromRedisBefore);
        const dataFromRedisAfter = await getDataFromRedis();
        const expected = 'Result of handling redis key';

        expect(dataFromRedisBefore).to.have.deep.members(expectedData);
        expect(loggerSpy.info).to.have.been.calledWith(expected);
        expect(dataFromRedisAfter).to.be.null;
        expect(postEpicUpdatesStub).to.be.called;
    });

    it('test error in key handleRedisData', async () => {
        postEpicUpdatesStub.throws('error');

        const dataFromRedisBefore = await getDataFromRedis();
        await handleRedisData('client', dataFromRedisBefore);
        const dataFromRedisAfter = await getDataFromRedis();
        const expected = 'Error in postEpicUpdates_2018-1-11 13:08:04,225\n';

        expect(dataFromRedisBefore).to.have.deep.members(expectedData);
        expect(loggerSpy.error).to.have.been.calledWith(expected);
        expect(dataFromRedisAfter).to.have.deep.members(expectedData);
        expect(postEpicUpdatesStub).to.be.called;
    });

    it('test correct roomsData', async () => {
        const roomsData = await getRedisRooms();
        expect(roomsData).to.have.deep.members(expectedRoom);
    });

    it('test handleRedisRooms with error', async () => {
        await saveIncoming({redisKey: 'newrooms', createRoomData});
        createRoomStub.callsFake(data => {
            logger.debug('data', data);
            if (data.issue.key === 'BBCOM-1111') {
                throw 'createRoomStub';
            }
        });
        const roomsData = await getRedisRooms();
        expect(roomsData).to.have.deep.equal([...expectedRoom, ...createRoomData]);
        await handleRedisRooms(chatApi, roomsData);
        expect(loggerSpy.error).to.have.been.calledWith('Error in handle room data\n', 'createRoomStub');
        expect(loggerSpy.warn).to.have.been.calledWith('Rooms which not created', createRoomData);

        const roomsKeysAfter = await getRedisRooms();
        expect(roomsKeysAfter).to.have.deep.equal(createRoomData);
    });

    it('test correct handleRedisRooms', async () => {
        const roomsKeysBefore = await getRedisRooms();
        await handleRedisRooms(chatApi, roomsKeysBefore);
        expect(createRoomStub).to.be.called;
        const roomsKeysAfter = await getRedisRooms();
        expect(roomsKeysAfter).to.be.null;
    });

    it('test null handleRedisRooms', async () => {
        await handleRedisRooms(chatApi, null);
        expect(createRoomStub).not.to.be.called;
    });

    it('test incorrect handleRedisRooms', async () => {
        await handleRedisRooms(chatApi, 'rooms');
        expect(createRoomStub).not.to.be.called;
        const expected = 'handleRedisRooms error';
        expect(loggerSpy.error).to.have.been.calledWith(expected);
    });

    afterEach(async () => {
        nock.cleanAll();
        Object.keys(loggerSpy).map(el => loggerSpy[el].reset());
        createRoomStub.reset();
        await cleanRedis();
    });
});

describe('Redis errors in redis-data-handle', () => {
    const {
        rewriteRooms: rewrite,
        saveIncoming: save,
        getRedisValue: getValue,
        getDataFromRedis: getRedisData,
        getRedisRooms: getRooms,
        handleRedisData: handleData,
    } = proxyquire('../../src/queue/redis-data-handle.js', {
        '../redis-client.js': {
            getAsync: stub().throws('error'),
            keysAsync: stub().throws('error'),
            setAsync: stub().throws('error'),
        },
        '../modules/log.js': () => loggerSpy,
    });

    it('test error getRedisRooms', async () => {
        const result = await getRooms();
        const expected = 'getRedisRooms error';
        expect(result).to.be.null;
        expect(loggerSpy.error).to.have.been.calledWithExactly(expected);
    });

    it('test error handleRedisData', async () => {
        await handleData('client', 'data');
        const expected = 'handleRedisData error';
        expect(loggerSpy.error).to.have.been.calledWith(expected);
    });

    it('test no handleRedisData', async () => {
        await handleData('client');
        const expected = 'No data from redis';
        expect(loggerSpy.warn).to.have.been.calledWithExactly(expected);
    });

    it('test no handleRedisData', async () => {
        const result = await getRedisData();
        const expected = 'getDataFromRedis error';
        expect(result).to.be.null;
        expect(loggerSpy.error).to.have.been.calledWith(expected);
    });

    it('test no getRedisValue', async () => {
        const result = await getValue({});
        const expected = 'Error in getting value of key: [object Object]\n';

        expect(result).to.be.false;
        expect(loggerSpy.error).to.have.been.calledWith(expected);
    });

    it('test no save to redis error', async () => {
        const expected = 'Error while saving to redis:\nerror';
        try {
            await save({});
        } catch (err) {
            expect(err).to.be.equal(expected);
        }
    });

    it('test rewrite rooms error', async () => {
        const expected = 'Error while rewrite rooms in redis:\nerror';
        try {
            await rewrite('');
        } catch (err) {
            expect(err).to.be.equal(expected);
        }
    });
});
