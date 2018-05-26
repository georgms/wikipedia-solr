const ndcgMethods = require('./ndcg');

describe('NDCG', () => {
    let idealRanking = ['a', 'b', 'c'];

    test('is 1 for ideal ranking', () => {
        let ndcg = ndcgMethods.calculate(idealRanking, idealRanking);
        expect(ndcg).toEqual(1);
    });

    test('is 0 for no matches', () => {
        let ndcg = ndcgMethods.calculate([], idealRanking);
        expect(ndcg).toEqual(0);
    });

    test('is between 0 and 1 for some matches', () => {
        let actualRanking = ['b', 'a', 'c'];
        let ndcg = ndcgMethods.calculate(actualRanking, idealRanking);
        expect(ndcg).toEqual(0.630929753571458);
    });

    test('respects cutoff', () => {
        let actualRanking = ['a', 'c', 'b'];
        let ndcg = ndcgMethods.calculate(actualRanking, idealRanking, 1);
        expect(ndcg).toEqual(1);
    });

    test('is not affected by additional results without relevance', () => {
        let actualRanking = idealRanking;
        actualRanking.push('d');

        let ndcg = ndcgMethods.calculate(actualRanking, idealRanking);
        expect(ndcg).toEqual(1);
    });
});
