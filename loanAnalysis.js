var http = require('http');
var request = require('superagent');

//helper function to return array of loan objects
function loanStrategy(accountID, income, necessaryExpenses, savings, bufferSavings) {
  var loans;
  var loansBudget = income + savings - bufferSavings - necessaryExpenses;
  //[["loan2._id", 45(amountToPay), 4(monthlyPayment)], [“loan1._id”, 30, 7], [“loan3._id”, 3, 12], ...]
  var sortedLoans = [];
  return new Promise(function(resolve, reject) {
    void request.get('http://api.reimaginebanking.com/accounts/' + accountID + '/loans?key=61d12d8622f5ed2f9f6db6e0b014c0d5').buffer(true).end(function(err,res){
      loans = JSON.parse(res.text);
      //loops through to add all loans and their amount/monthlyPayment
      for (var i = 0; i < loans.length; i++){
        sortedLoans[i] = [loans[i]["_id"], loans[i]["amount"], loans[i]["monthly_payment"]];
      }
      resolve(loanStrategyHelper(sortedLoans, loansBudget));
    });
  });
}
/*returns object that tells the account which loans to pay and how much to minimize loss while mainting a
savings level(bufferSavings) and making necessary expenditures. Tries to make monthly payment for each loan at least.
Makes no payment for lesser priority loans when no budget left*/
//also returns loan amounts after strategy
//returns array [{planning}, {amountsAfter}]
//prioritizes smaller loan amounts to get them out of the way
//Ex: returns [{“loan1._id”: 30, “loan2._id”: 45, “loan3._id”: 0, “loan4._id”: 0, ...}, {"loan1._id”: 0, “loan2._id”: 2, “loan3._id”: 44, “loan4._id”: 88, ..."}, [["loan1._id", 60, 15], ...]]]
function loanStrategyHelper(sortedLoans, loansBudget){
  //sorts loans by amount: smallest(high priority) --> largest(low priority)
  sortedLoans.sort(function(first, second) {
    return first[1] - second[1];
  })
  //turns sortedLoans into a dictionary thats values are how much to spend on a loan
  var loansPlan = {};
  //inital loop to make at least monthly payment to each loan starting at smallest monthly_payment
  for (var i = 0; i < sortedLoans.length; i++) {
    if (loansBudget > 0) {
      //edge case if budget > monthly_payment[2] > amount[1]
      if (loansBudget >= sortedLoans[i][2] && sortedLoans[i][2] >= sortedLoans[i][1]) {
        loansBudget -= sortedLoans[i][1];
        loansPlan[sortedLoans[i][0]] = sortedLoans[i][1];
        sortedLoans[i][1] = 0;
      }
      //budget > amount[1] > payment[2]
      else if (loansBudget >= sortedLoans[i][1] && sortedLoans[i][1] >= sortedLoans[i][2]) {
        loansBudget -= sortedLoans[i][2];
        loansPlan[sortedLoans[i][0]] = sortedLoans[i][2];
        sortedLoans[i][1] -= sortedLoans[i][2];
      }
      //payment[2] > budget > amount[1]
      else if (sortedLoans[i][2] >= budget && budget >= sortedLoans[i][1]) {
        loansBudget -= sortedLoans[i][1];
        loansPlan[sortedLoans[i][0]] = sortedLoans[i][1];
        sortedLoans[i][1] = 0;
      }
      //payment[2] > amount[1] > budget
      else if (sortedLoans[i][2] >= sortedLoans[i][1] && sortedLoans[i][1] >= loansBudget) {
        sortedLoans[i][1] -= loansBudget;
        loansPlan[sortedLoans[i][0]] = loansBudget;
        loansBudget = 0;
      }
      //amount[1] > payment[2] > budget
      else if (sortedLoans[i][1] >= sortedLoans[i][2] && sortedLoans[i][2] >= loansBudget) {
        sortedLoans[i][1] -= loansBudget;
        loansPlan[sortedLoans[i][0]] = loansBudget;
        loansBudget = 0;
      }
      //amount[1] > budget > payment[2]
      else {
        sortedLoans[i][1] -= sortedLoans[i][2];
        loansBudget -= sortedLoans[i][2];
        loansPlan[sortedLoans[i][0]] = sortedLoans[i][2];
      }
    }
    else {
      loansPlan[sortedLoans[i][0]] = 0;
    }
  }
  //resorts loans by new amount: smallest(high priority) --> largest(low priority)
  sortedLoans.sort(function(first, second) {
    return first[1] - second[1];
  })
  //second loop to finish off smallest amount loans
  for (var i = 0; i < sortedLoans.length; i++) {
    if (loansBudget > 0) {
      //edge case if budget > amount[1]
      if (loansBudget >= sortedLoans[i][1]) {
        loansBudget -= sortedLoans[i][1];
        loansPlan[sortedLoans[i][0]] += sortedLoans[i][1];
        sortedLoans[i][1] = 0;
      }
      else {
        sortedLoans[i][1] -= loansBudget;
        loansPlan[sortedLoans[i][0]] += loansBudget;
        loansBudget = 0
      }
    }
  }
  //puts final amount of each loan to dictionary
  finalLoanAmounts = {};
  for (var i = 0; i < sortedLoans.length; i++){
    finalLoanAmounts[sortedLoans[i][0]] = sortedLoans[i][1];
  }
  //return value of loan Strategy,
  return([loansPlan, finalLoanAmounts, sortedLoans]);
}

/*Returns array containing total loan amounts an account has until it reaches 0
Can return array length - 1 to determine months until it reaches 0
>>>loanStratTimeLine(accountID, income, necessaryExpenses, savings, bufferSavings)
>[5, 2, 1, 0]*/
function loanStratTimeLine(accountID, income, necessaryExpenses, savings, bufferSavings) {
  var loans;
  var loansBudget = income + savings - bufferSavings - necessaryExpenses;
  //[["loan2._id", 45(amountToPay), 4(monthlyPayment)], [“loan1._id”, 30, 7], [“loan3._id”, 3, 12], ...]
  var sortedLoans = [];
  return new Promise(function(resolve, reject) {
    void request.get('http://api.reimaginebanking.com/accounts/' + accountID + '/loans?key=61d12d8622f5ed2f9f6db6e0b014c0d5').buffer(true).end(function(err,res){
      loans = JSON.parse(res.text);
      //loops through to add all loans and their amount/monthlyPayment
      for (var i = 0; i < loans.length; i++){
        sortedLoans[i] = [loans[i]["_id"], loans[i]["amount"], loans[i]["monthly_payment"]];
      }
      //recursive loop until totalLoanAmount is 0
      var loanRecord = [];
      var count = 0;
      //find initial totalLoanAmount
      var totalLoanAmount = 0;
      for (var i = 0; i < sortedLoans.length; i++){
        totalLoanAmount += sortedLoans[i][1];
      }
      while (totalLoanAmount != 0){
        loanRecord[count] = totalLoanAmount;
        sortedLoans = loanStrategyHelper(sortedLoans, loansBudget)[2];
        var tempTotalLoanAmount = 0;
        for (var i = 0; i < sortedLoans.length; i++){
          tempTotalLoanAmount += sortedLoans[i][1];
        }
        totalLoanAmount = tempTotalLoanAmount;
        count++;
      }
      loanRecord[count] = totalLoanAmount;
      resolve(loanRecord);
    });
  });
}

//same functionality as loanStrategy but takes into account an averaged interest rate(interest: .03 --> 1.03) applied to all loans
//assumes user pays before interest applied
function loanStrategyInterest(accountID, income, necessaryExpenses, savings, bufferSavings, interest) {
  var loans;
  var loansBudget = income + savings - bufferSavings - necessaryExpenses;
  //[["loan2._id", 45(amountToPay), 4(monthlyPayment)], [“loan1._id”, 30, 7], [“loan3._id”, 3, 12], ...]
  var sortedLoans = [];
  return new Promise(function(resolve, reject) {
    void request.get('http://api.reimaginebanking.com/accounts/' + accountID + '/loans?key=61d12d8622f5ed2f9f6db6e0b014c0d5').buffer(true).end(function(err,res){
      loans = JSON.parse(res.text);
      //loops through to add all loans and their amount/monthlyPayment
      for (var i = 0; i < loans.length; i++){
        sortedLoans[i] = [loans[i]["_id"], loans[i]["amount"], loans[i]["monthly_payment"]];
      }
      resolve(loanStrategyHelperInterest(sortedLoans, loansBudget, interest));
    });
  });
}

//same functionality as loanStrategyHelper but takes into account an averaged interest rate applied to all loans
function loanStrategyHelperInterest(sortedLoans, loansBudget, interest){
  //sorts loans by amount: smallest(high priority) --> largest(low priority)
  sortedLoans.sort(function(first, second) {
    return first[1] - second[1];
  })
  //turns sortedLoans into a dictionary thats values are how much to spend on a loan
  var loansPlan = {};
  //inital loop to make at least monthly payment to each loan starting at smallest monthly_payment
  for (var i = 0; i < sortedLoans.length; i++) {
    if (loansBudget > 0) {
      //edge case if budget > monthly_payment[2] > amount[1]
      if (loansBudget >= sortedLoans[i][2] && sortedLoans[i][2] >= sortedLoans[i][1]) {
        loansBudget -= sortedLoans[i][1];
        loansPlan[sortedLoans[i][0]] = sortedLoans[i][1];
        sortedLoans[i][1] = 0;
      }
      //budget > amount[1] > payment[2]
      else if (loansBudget >= sortedLoans[i][1] && sortedLoans[i][1] >= sortedLoans[i][2]) {
        loansBudget -= sortedLoans[i][2];
        loansPlan[sortedLoans[i][0]] = sortedLoans[i][2];
        sortedLoans[i][1] -= sortedLoans[i][2];
      }
      //payment[2] > budget > amount[1]
      else if (sortedLoans[i][2] >= budget && budget >= sortedLoans[i][1]) {
        loansBudget -= sortedLoans[i][1];
        loansPlan[sortedLoans[i][0]] = sortedLoans[i][1];
        sortedLoans[i][1] = 0;
      }
      //payment[2] > amount[1] > budget
      else if (sortedLoans[i][2] >= sortedLoans[i][1] && sortedLoans[i][1] >= loansBudget) {
        sortedLoans[i][1] -= loansBudget;
        loansPlan[sortedLoans[i][0]] = loansBudget;
        loansBudget = 0;
      }
      //amount[1] > payment[2] > budget
      else if (sortedLoans[i][1] >= sortedLoans[i][2] && sortedLoans[i][2] >= loansBudget) {
        sortedLoans[i][1] -= loansBudget;
        loansPlan[sortedLoans[i][0]] = loansBudget;
        loansBudget = 0;
      }
      //amount[1] > budget > payment[2]
      else {
        sortedLoans[i][1] -= sortedLoans[i][2];
        loansBudget -= sortedLoans[i][2];
        loansPlan[sortedLoans[i][0]] = sortedLoans[i][2];
      }
    }
    else {
      loansPlan[sortedLoans[i][0]] = 0;
    }
  }
  //resorts loans by new amount: smallest(high priority) --> largest(low priority)
  sortedLoans.sort(function(first, second) {
    return first[1] - second[1];
  })
  //second loop to finish off smallest amount loans
  for (var i = 0; i < sortedLoans.length; i++) {
    if (loansBudget > 0) {
      //edge case if budget > amount[1]
      if (loansBudget >= sortedLoans[i][1]) {
        loansBudget -= sortedLoans[i][1];
        loansPlan[sortedLoans[i][0]] += sortedLoans[i][1];
        sortedLoans[i][1] = 0;
      }
      else {
        sortedLoans[i][1] -= loansBudget;
        loansPlan[sortedLoans[i][0]] += loansBudget;
        loansBudget = 0
      }
    }
  }
  //applies interest to loam amounts
  for (var i = 0; i < sortedLoans.length; i++){
    sortedLoans[i][1] = sortedLoans[i][1] * (1 + interest);
  }
  //puts final amount of each loan to dictionary
  finalLoanAmounts = {};
  for (var i = 0; i < sortedLoans.length; i++){
    finalLoanAmounts[sortedLoans[i][0]] = sortedLoans[i][1];
  }
  //return value of loan Strategy,
  return([loansPlan, finalLoanAmounts, sortedLoans]);
}

//same as loanStratTimeLine but with interest applied (interest: .03 --> 1.03)
//assumes user pays before interest applies
function loanStratTimeLineInterest(accountID, income, necessaryExpenses, savings, bufferSavings, interest) {
  var loans;
  var loansBudget = income + savings - bufferSavings - necessaryExpenses;
  //[["loan2._id", 45(amountToPay), 4(monthlyPayment)], [“loan1._id”, 30, 7], [“loan3._id”, 3, 12], ...]
  var sortedLoans = [];
  return new Promise(function(resolve, reject) {
    void request.get('http://api.reimaginebanking.com/accounts/' + accountID + '/loans?key=61d12d8622f5ed2f9f6db6e0b014c0d5').buffer(true).end(function(err,res){
      loans = JSON.parse(res.text);
      //loops through to add all loans and their amount/monthlyPayment
      for (var i = 0; i < loans.length; i++){
        sortedLoans[i] = [loans[i]["_id"], loans[i]["amount"], loans[i]["monthly_payment"]];
      }
      //recursive loop until totalLoanAmount is 0
      var loanRecord = [];
      var count = 0;
      //find initial totalLoanAmount
      var totalLoanAmount = 0;
      for (var i = 0; i < sortedLoans.length; i++){
        totalLoanAmount += sortedLoans[i][1];
      }
      while (totalLoanAmount != 0){
        loanRecord[count] = totalLoanAmount;
        sortedLoans = loanStrategyHelperInterest(sortedLoans, loansBudget, interest)[2];
        var tempTotalLoanAmount = 0;
        for (var i = 0; i < sortedLoans.length; i++){
          tempTotalLoanAmount += sortedLoans[i][1];
        }
        totalLoanAmount = tempTotalLoanAmount;
        count++;
      }
      loanRecord[count] = totalLoanAmount;
      resolve(loanRecord);
    });
  });
}

 module.exports = {
   http,
   request,
   loanStrategy,
   loanStratTimeLine,
   loanStrategyInterest,
   loanStratTimeLineInterest
 }
