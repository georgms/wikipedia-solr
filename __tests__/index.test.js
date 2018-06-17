const sampleDocs = require('./sampledocs.test.json');

describe('Index', () => {
    it('should have called the fetch function wih the good const parameter and slug', done => {


        jest.mock('request-promise', () => {
            return jest.fn((input) => {
                return Promise.resolve('something');
            });
        });
        const indexMethods = require('../index');
        indexMethods.readAndImportFiles('./__tests__/simplewiki.test.json', 2).then(() => {
            let requestSpy = require('request-promise');
            expect(requestSpy).toHaveBeenCalledTimes(2);

            let firstCall = requestSpy.mock.calls[0][0];
            expect(firstCall.url).toEqual('http://172.17.0.1:8983/solr/gettingstarted/update/json/docs?commitWithin=10000&overwrite=true&wt=json');
            expect(firstCall.json).toEqual([sampleDocs[0], sampleDocs[1]]);

            let secondCall = requestSpy.mock.calls[1][0];
            expect(secondCall.url).toEqual('http://172.17.0.1:8983/solr/gettingstarted/update/json/docs?commitWithin=10000&overwrite=true&wt=json');
            expect(secondCall.json).toEqual([sampleDocs[2]]);
            done();
        });
    });
})
;