// 1. Work on updating SQL database with new stock datas
// 2. Finish Total summary historic prices
// 3. Add benchmark functionality
// 4. Add News page
// 5. Publish and host website
// 6. Add password protection to buy/Sell
// 7. Add graphing scale functionality


var port = process.env.PORT || 8080;
const express = require('express')
const app = express()
const bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({extended: false});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs')

app.get('/', function (req, res) {
  res.render('index');
});
//was 3000
app.listen(port, function () {
  console.log('Example app listening on port 3000!')
});



app.post('/', function (req, res) {
  res.render('index');
});


app.get('/transaction', function (req, res) {
    res.render('transaction');
});




app.get('/holdings', function (req, res) {
    con.query("SELECT * FROM holdings", function(err, result) {
      if (err) throw err;
      con.query("SELECT ticker FROM holdings;", function(err1, result1) {
        if (err1) throw err1;

      res.render('holdings', {datas: result, stock_list: result1});
      });
    });
});

app.get('/buy', function (req, res) {
  res.render('buy');
});

app.post('/buy-transaction', function (req, res) {
  var stock = req.body['ticker'];
  var https = require('https');
  var url = `https://api.iextrading.com/1.0/tops/last?symbols=${stock}`; //this will fail if not a real stock was entered
  https.get(url, function(res){
    var body = '';
    res.on('data', function(chunk){
      body += chunk;
    });
    res.on('end', function(){
      var historicalResponse = JSON.parse(body);
      var pur_price = req.body['cost'] / req.body['shares']
      var mar_value = historicalResponse[0]['price'] * req.body['shares']
      var date = new Date().toISOString().split('T')[0]
      con.query('SELECT ticker FROM holdings;', function (err, res) {
        var owned_stocks = [];
        res.forEach(function(element) {
          owned_stocks.push(element['ticker']);
        });
        console.log(owned_stocks);
        if (owned_stocks.includes(stock)) {
          con.query(`UPDATE holdings SET shares='${req.body["shares"]}', cost='${req.body["cost"]}' WHERE ticker='${req.body['ticker']}';`);
        } else {
          con.query(`INSERT INTO holdings VALUES ('${req.body['security_name']}', '${req.body['ticker']}', '${req.body['sector']}', '${req.body['shares']}', '${pur_price}', '${historicalResponse[0]['price']}', '${req.body['cost']}', '${mar_value}', NULL, NULL, NULL, '${date}');`);
        }
      });
    });
  });
});

app.post('/sell-transaction', function (req, res) {
  var stock = req.body['ticker'];
  console.log(req.body);
  if (req.body['shares'] == 0) {
    con.query(`DELETE FROM holdings WHERE ticker='${stock}';`);
  } else {
    con.query(`UPDATE holdings SET shares='${req.body["shares"]}', cost='${req.body["cost"]}' WHERE ticker='${req.body['ticker']}';`);
  }
});

app.post('/graph', function (req, res) {
  var stock_list = [];
  var stock_datasets = [];
  for (var key in req.body){
    stock_list.push(req.body[key]);
  }
  stock_list.unshift('historic_date');
  con.query(`SELECT ${stock_list.toString()} FROM historic_prices;`, function(err, result) {
    var labels = result.map(function(obj) {return obj.historic_date;});
    let stocks_data = []
    for (let x = 1; x < stock_list.length; x++) {
      stocks_data.push(result.map(function(obj) {return obj[stock_list[x]];}));
    }
    for (let x = 0; x < stocks_data.length; x++) {
      let a = {
        label: stock_list[x+1],
        data: stocks_data[x],
        borderColor: 'rgba(255,99,132,1)'
      }
      stock_datasets.push(a);
    };
    console.log(stocks_data);
    console.log(stock_datasets);
  res.render('graph', {labels: labels, stock_datasets: stock_datasets, stock_list: stock_list});
  });
});




app.get('/sell', function (req, res) {
  res.render('sell');
});


app.get('/update', function (req, res) {
  con.connect(function(err) {
    con.query("SELECT ticker FROM holdings", function (err, result) {
      if (err) throw err;
      result.forEach(function(ticker){
        var stock = ticker.ticker;
        var https = require('https');
        var url = `https://api.iextrading.com/1.0/stock/${stock}/chart/3m`;

        https.get(url, function(res){
          var body = '';

          res.on('data', function(chunk){
            body += chunk;
          });

          res.on('end', function(){
            var historicalResponse = JSON.parse(body);
            historicalResponse.forEach(function(valInResponse) {
              var sql = `INSERT INTO historic_prices (historic_date, ${stock}) VALUES('${valInResponse['date']}', ${valInResponse['close']}) ON DUPLICATE KEY UPDATE ${stock}=${valInResponse['close']}`;
              con.query(sql, function (err, result) {
                if (err) throw err;
                console.log(".......record updated");
              });
            });
          });
        }).on('error', function(e){
          console.log("Got an error: ", e);
        });
      });
    });
  });
  res.redirect('/')
});
var mysql = require('mysql');

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "password",
  database: "securityholdings"
});
