const assert = require('assert');
const mtg_sets = require('../../src/js/mtg_sets.js');

describe('mtg_sets', () => {
    describe('#expandSets', () => {
            it('should work with "standard-ktk" includeTokens=false', (done) => {
                let result = mtg_sets.expandSets('standard-ktk', includeTokens=false);
                console.log("mtg_sets.expandSets('standard-ktk', includeTokens=false) returned:", JSON.stringify(result));
                assert.deepEqual(
                    result,
                    ["ths","bng","jou","m15","ktk"]
                );
                done();
            })
            it('should work with "standard-ktk" includeTokens=true', (done) => {
                let result = mtg_sets.expandSets('standard-ktk', includeTokens=true);
                console.log("mtg_sets.expandSets('standard-ktk', includeTokens=true) returned:", JSON.stringify(result));
                assert.deepEqual(
                    result,
                    ["ths","tths","tfth","bng","tbng","tbth","jou","tjou","tdag","m15","tm15","ktk","tktk"]
                );
                done();
            })
            it('should work with "modern" includeTokens=false', (done) => {
                let result = mtg_sets.expandSets('modern', includeTokens=false);
                console.log("mtg_sets.expandSets('modern', includeTokens=false) returned:", JSON.stringify(result));
                assert.deepEqual(
                    result,
                    ["8ed","mrd","dst","5dn","chk","bok","sok","9ed","rav","gpt","dis","csp","tsb","tsp","plc","fut","10e","lrw","mor","shm","eve","ala","con","arb","m10","zen","wwk","roe","m11","som","mbs","nph","m12","isd","dka","avr","m13","rtr","gtc","dgm","mma","m14","ths","bng","jou","cp1","m15","ktk","cp2","frf","dtk","mm2","cp3","ori","bfz","ogw","soi","w16","emn","kld","aer","mm3","w17","akh","hou","xln","rix","dom","m19","ana","grn","rna","war","mh1","m20","eld","thb","iko","m21","ajmp","anb","znr"]
                );
                done();
            })
            it('should work with "modern" includeTokens=true', (done) => {
                let result = mtg_sets.expandSets('modern', includeTokens=true);
                console.log("mtg_sets.expandSets('modern', includeTokens=true) returned:", JSON.stringify(result));
                assert.deepEqual(
                    result,
                    ["8ed","mrd","dst","5dn","chk","bok","sok","9ed","rav","gpt","dis","csp","tcsp","tsb","tsp","plc","fut","10e","t10e","lrw","tlrw","mor","tmor","shm","tshm","eve","teve","ala","tala","con","tcon","arb","tarb","m10","tm10","zen","tzen","wwk","twwk","roe","troe","m11","tm11","som","tsom","mbs","tmbs","nph","tnph","m12","tm12","isd","tisd","dka","tdka","avr","tavr","m13","tm13","rtr","trtr","gtc","tgtc","dgm","tdgm","mma","tmma","m14","tm14","ths","tths","tfth","bng","tbng","tbth","jou","tjou","tdag","cp1","m15","tm15","ktk","tktk","cp2","frf","tfrf","dtk","tdtk","mm2","tmm2","cp3","ori","tori","bfz","tbfz","ogw","togw","soi","w16","tsoi","emn","temn","kld","tkld","aer","taer","mm3","tmm3","w17","akh","takh","hou","thou","xln","txln","rix","trix","dom","tdom","m19","tm19","ana","grn","tgrn","rna","trna","war","twar","tmh1","mh1","m20","tm20","teld","eld","thb","tthb","iko","tiko","tm21","m21","ajmp","anb","znr","tznr"]
                );
                done();
            })
            it('should work with "vintage" includeTokens=false', (done) => {
                let result = mtg_sets.expandSets('vintage', includeTokens=false);
                console.log("mtg_sets.expandSets('vintage', includeTokens=false) returned:", JSON.stringify(result));
                assert.deepEqual(
                    result,
                    ["lea","leb","2ed","arn","atq","3ed","leg","drk","fem","4ed","ice","hml","all","mir","itp","vis","5ed","por","ppod","wth","tmp","sth","exo","p02","usg","ulg","6ed","uds","s99","ptk","mmq","nem","s00","pcy","inv","pls","7ed","apc","ody","tor","jud","ons","lgn","scg","8ed","mrd","dst","5dn","chk","bok","sok","9ed","rav","gpt","dis","csp","tsb","tsp","plc","fut","10e","lrw","mor","shm","eve","ala","con","arb","m10","zen","wwk","roe","m11","som","mbs","nph","m12","isd","dka","avr","m13","rtr","gtc","dgm","m14","ths","bng","jou","cp1","m15","ktk","cp2","frf","dtk","cp3","ori","bfz","ogw","soi","w16","emn","kld","aer","w17","akh","hou","xln","rix","dom","m19","ana","grn","rna","war","m20","eld","thb","iko","m21","ajmp","anb","znr"]
                );
                done();
            })
            it('should work with "vintage" includeTokens=true', (done) => {
                let result = mtg_sets.expandSets('vintage', includeTokens=true);
                console.log("mtg_sets.expandSets('vintage', includeTokens=true) returned:", JSON.stringify(result));
                assert.deepEqual(
                    result,
                    ["lea","leb","2ed","arn","atq","3ed","leg","drk","fem","4ed","ice","hml","all","mir","itp","vis","5ed","por","ppod","wth","tmp","sth","exo","p02","usg","ulg","6ed","uds","s99","ptk","mmq","nem","s00","pcy","inv","pls","7ed","apc","ody","tor","jud","ons","lgn","scg","8ed","mrd","dst","5dn","chk","bok","sok","9ed","rav","gpt","dis","csp","tcsp","tsb","tsp","plc","fut","10e","t10e","lrw","tlrw","mor","tmor","shm","tshm","eve","teve","ala","tala","con","tcon","arb","tarb","m10","tm10","zen","tzen","wwk","twwk","roe","troe","m11","tm11","som","tsom","mbs","tmbs","nph","tnph","m12","tm12","isd","tisd","dka","tdka","avr","tavr","m13","tm13","rtr","trtr","gtc","tgtc","dgm","tdgm","m14","tm14","ths","tths","tfth","bng","tbng","tbth","jou","tjou","tdag","cp1","m15","tm15","ktk","tktk","cp2","frf","tfrf","dtk","tdtk","cp3","ori","tori","bfz","tbfz","ogw","togw","soi","w16","tsoi","emn","temn","kld","tkld","aer","taer","w17","akh","takh","hou","thou","xln","txln","rix","trix","dom","tdom","m19","tm19","ana","grn","tgrn","rna","trna","war","twar","m20","tm20","teld","eld","thb","tthb","iko","tiko","tm21","m21","ajmp","anb","znr","tznr"]
                );
                done();
            })
            it('should work with "commander" includeTokens=false', (done) => {
                let result = mtg_sets.expandSets('commander', includeTokens=false);
                console.log("mtg_sets.expandSets('commander', includeTokens=false) returned:", JSON.stringify(result));
                assert.deepEqual(
                    result,
                    ["lea","leb","2ed","arn","atq","3ed","leg","drk","fem","4ed","ice","hml","all","mir","itp","vis","5ed","por","ppod","wth","tmp","sth","exo","p02","usg","ulg","6ed","uds","s99","ptk","mmq","nem","s00","pcy","inv","pls","7ed","apc","ody","tor","jud","ons","lgn","scg","8ed","mrd","dst","5dn","chk","bok","sok","9ed","rav","gpt","dis","csp","tsb","tsp","plc","fut","10e","lrw","mor","shm","eve","ala","con","arb","m10","zen","wwk","roe","m11","som","mbs","nph","cmd","m12","isd","dka","avr","m13","rtr","cm1","gtc","dgm","m14","ths","c13","bng","jou","cp1","m15","ktk","c14","cp2","frf","dtk","cp3","ori","bfz","c15","ogw","soi","w16","emn","kld","c16","aer","w17","akh","cma","hou","c17","xln","rix","dom","cm2","m19","ana","c18","grn","rna","war","m20","c19","eld","thb","c20","iko","m21","ajmp","anb","znr"]
                );
                done();
            })
            it('should work with "commander" includeTokens=true', (done) => {
                let result = mtg_sets.expandSets('commander', includeTokens=true);
                console.log("mtg_sets.expandSets('commander', includeTokens=true) returned:", JSON.stringify(result));
                assert.deepEqual(
                    result,
                    ["lea","leb","2ed","arn","atq","3ed","leg","drk","fem","4ed","ice","hml","all","mir","itp","vis","5ed","por","ppod","wth","tmp","sth","exo","p02","usg","ulg","6ed","uds","s99","ptk","mmq","nem","s00","pcy","inv","pls","7ed","apc","ody","tor","jud","ons","lgn","scg","8ed","mrd","dst","5dn","chk","bok","sok","9ed","rav","gpt","dis","csp","tcsp","tsb","tsp","plc","fut","10e","t10e","lrw","tlrw","mor","tmor","shm","tshm","eve","teve","ala","tala","con","tcon","arb","tarb","m10","tm10","zen","tzen","wwk","twwk","roe","troe","m11","tm11","som","tsom","mbs","tmbs","nph","tnph","cmd","m12","tm12","isd","tisd","dka","tdka","avr","tavr","m13","tm13","rtr","trtr","cm1","gtc","tgtc","dgm","tdgm","m14","tm14","ths","tths","tfth","c13","bng","tbng","tbth","jou","tjou","tdag","cp1","m15","tm15","ktk","tktk","c14","tc14","cp2","frf","tfrf","dtk","tdtk","cp3","ori","tori","bfz","tbfz","c15","tc15","ogw","togw","soi","w16","tsoi","emn","temn","kld","tkld","c16","tc16","aer","taer","w17","akh","takh","cma","tcma","hou","thou","c17","tc17","xln","txln","rix","trix","dom","tdom","cm2","tcm2","m19","tm19","ana","c18","tc18","grn","tgrn","rna","trna","war","twar","m20","tm20","tc19","c19","teld","eld","thb","tthb","c20","tc20","iko","tiko","tm21","m21","ajmp","anb","znr","tznr"]
                );
                done();
            })
            it('should work with "all_sets" includeTokens=false', (done) => {
                let result = mtg_sets.expandSets('all_sets', includeTokens=false);
                console.log("mtg_sets.expandSets('all_sets', includeTokens=false) returned:", JSON.stringify(result));
                assert.deepEqual(
                    result,
                    ["lea","leb","2ed","arn","atq","3ed","leg","drk","fem","4ed","ice","hml","all","mir","itp","vis","5ed","por","ppod","wth","tmp","sth","exo","p02","usg","ulg","6ed","uds","s99","ptk","mmq","nem","s00","pcy","inv","pls","7ed","apc","ody","tor","jud","ons","lgn","scg","8ed","mrd","dst","5dn","chk","bok","sok","9ed","rav","gpt","dis","csp","tsb","tsp","plc","fut","10e","lrw","mor","shm","eve","ala","con","arb","m10","zen","wwk","roe","m11","som","mbs","nph","cmd","m12","isd","dka","avr","m13","rtr","cm1","gtc","dgm","mma","m14","ths","c13","bng","jou","cp1","m15","ktk","c14","cp2","frf","dtk","mm2","cp3","ori","bfz","c15","ogw","soi","w16","emn","kld","c16","aer","mm3","w17","akh","cma","hou","c17","xln","rix","dom","cm2","m19","ana","c18","grn","rna","war","mh1","m20","c19","eld","thb","c20","iko","m21","ajmp","anb","znr"]
                );
                done();
            })
            it('should work with "all_sets" includeTokens=true', (done) => {
                let result = mtg_sets.expandSets('all_sets', includeTokens=true);
                console.log("mtg_sets.expandSets('all_sets', includeTokens=true) returned:", JSON.stringify(result));
                assert.deepEqual(
                    result,
                    ["lea","leb","2ed","arn","atq","3ed","leg","drk","fem","4ed","ice","hml","all","mir","itp","vis","5ed","por","ppod","wth","tmp","sth","exo","p02","usg","ulg","6ed","uds","s99","ptk","mmq","nem","s00","pcy","inv","pls","7ed","apc","ody","tor","jud","ons","lgn","scg","8ed","mrd","dst","5dn","chk","bok","sok","9ed","rav","gpt","dis","csp","tcsp","tsb","tsp","plc","fut","10e","t10e","lrw","tlrw","mor","tmor","shm","tshm","eve","teve","ala","tala","con","tcon","arb","tarb","m10","tm10","zen","tzen","wwk","twwk","roe","troe","m11","tm11","som","tsom","mbs","tmbs","nph","tnph","cmd","m12","tm12","isd","tisd","dka","tdka","avr","tavr","m13","tm13","rtr","trtr","cm1","gtc","tgtc","dgm","tdgm","mma","tmma","m14","tm14","ths","tths","tfth","c13","bng","tbng","tbth","jou","tjou","tdag","cp1","m15","tm15","ktk","tktk","c14","tc14","cp2","frf","tfrf","dtk","tdtk","mm2","tmm2","cp3","ori","tori","bfz","tbfz","c15","tc15","ogw","togw","soi","w16","tsoi","emn","temn","kld","tkld","c16","tc16","aer","taer","mm3","tmm3","w17","akh","takh","cma","tcma","hou","thou","c17","tc17","xln","txln","rix","trix","dom","tdom","cm2","tcm2","m19","tm19","ana","c18","tc18","grn","tgrn","rna","trna","war","twar","tmh1","mh1","m20","tm20","tc19","c19","teld","eld","thb","tthb","c20","tc20","iko","tiko","tm21","m21","ajmp","anb","znr","tznr"]
                );
                done();
            })
        })
    
    describe('#allAvailableSets', () => {
        it('should work', (done) => {
            let result = mtg_sets.allAvailableSets;
            console.log("mtg_sets.allAvailableSets returned:", JSON.stringify(result));
            assert.deepEqual(
                result,
                ["lea","leb","2ed","arn","atq","3ed","leg","drk","fem","4ed","ice","hml","all","mir","itp","vis","5ed","por","ppod","wth","tmp","sth","exo","p02","usg","ulg","6ed","uds","s99","ptk","mmq","nem","s00","pcy","inv","pls","7ed","apc","ody","tor","jud","ons","lgn","scg","8ed","mrd","dst","5dn","chk","bok","sok","9ed","rav","gpt","dis","csp","tcsp","tsb","tsp","plc","fut","10e","t10e","lrw","tlrw","mor","tmor","shm","tshm","eve","teve","ala","tala","con","tcon","arb","tarb","m10","tm10","zen","tzen","wwk","twwk","roe","troe","m11","tm11","som","tsom","mbs","tmbs","nph","tnph","cmd","m12","tm12","isd","tisd","dka","tdka","avr","tavr","m13","tm13","rtr","trtr","cm1","gtc","tgtc","dgm","tdgm","mma","tmma","m14","tm14","ths","tths","tfth","c13","bng","tbng","tbth","jou","tjou","tdag","cp1","m15","tm15","ktk","tktk","c14","tc14","cp2","frf","tfrf","dtk","tdtk","mm2","tmm2","cp3","ori","tori","bfz","tbfz","c15","tc15","ogw","togw","soi","w16","tsoi","emn","temn","kld","tkld","c16","tc16","aer","taer","mm3","tmm3","w17","akh","takh","cma","tcma","hou","thou","c17","tc17","xln","txln","rix","trix","dom","tdom","cm2","tcm2","m19","tm19","ana","c18","tc18","grn","tgrn","rna","trna","war","twar","tmh1","mh1","m20","tm20","tc19","c19","teld","eld","thb","tthb","c20","tc20","iko","tiko","tm21","m21","ajmp","anb","znr","tznr"]
            );
            done();
        })
    })
    describe('#inferMtgFormatFromText', () => {
        it('should work with standard', (done) => {
            assert.equal(
                mtg_sets.inferMtgFormatFromText('Finals Khans of Tarkir'),
                "standard-ktk"
            );
            done();
        })
        it('should match longer name first', (done) => {
            assert.equal(
                mtg_sets.inferMtgFormatFromText('Zendikar Rising Spoilers — September 5'),
                "standard-znr" // Zendikar Rising, and not "standard-zen" which corresponds to "Zendikar"
            );
            done();
        })
    })     
});
