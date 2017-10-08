const loanAnalysis = require('./loanAnalysis');

//prints out all the loans an account has
new Promise(function(resolve, reject) {
  void loanAnalysis.request.get('http://api.reimaginebanking.com/accounts/59d86e85a73e4942cdafdf8e/loans?key=61d12d8622f5ed2f9f6db6e0b014c0d5').buffer(true).end(function(err,res){
    loans = JSON.parse(res.text);
    console.log(loans);
    resolve(loans);
  })
});
//prints out the loan strategy {"loan._id": amountOfBudgetToSpendOnLoan, ...} which tells you what amount of money you should use to pay a loan for this month
//prints out loan amounts after a month of strategy
loanAnalysis.request.get('http://api.reimaginebanking.com/accounts/59d86e85a73e4942cdafdf8e/loans?key=61d12d8622f5ed2f9f6db6e0b014c0d5').buffer(true).end(function(err,res){
  loanAnalysis.loanStrategy('59d86e85a73e4942cdafdf8e', 30000, 10000, 5000, 12525).then(function(result1) {
    console.log(result1);
    loanAnalysis.loanStratTimeLine('59d86e85a73e4942cdafdf8e', 30000, 10000, 5000, 12525).then(function(result2) {
      console.log(result2);
    });
  });
})
