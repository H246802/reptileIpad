const cheerio = require("cheerio"); //引用cheerio模块,使在服务器端像在客户端上操作DOM,不用正则表达式
const superagent = require("superagent"); //是个 http 方面的库，可以发起 get 或 post 请求
// const mysql = require('mysql');
const schedule = require("node-schedule");
//nodemailer模块邮箱发送
const nodemailer = require("nodemailer");
//转hash模块
const fnv = require("fnv-plus");
//盛放每次需要发送邮箱的内容
let oldSendMsg1 = "";
let oldSendMsg2 = "";
let oldSendMsg3 = "";
console.log("start");

let getIpadMsg = (html) => {
  let window = {};
  // 以下用来防止报错
  let document = {};
  let as = {};
  let s = {};
  let asGetReferrer = {};
  let $ = cheerio.load(html);
  $("script").each(function (index, item) {
    let scr = $(item).html();
    try {
      eval(scr);
      if (window.REFURB_GRID_BOOTSTRAP) {
        REFURB_GRID_BOOTSTRAP = window.REFURB_GRID_BOOTSTRAP;
      }
    } catch (error) {
      // console.log(error);
    }
  });
  return window.REFURB_GRID_BOOTSTRAP;
};

//抓取数据
function fetchData() {
  var link = "https://www.apple.com.cn/cn-k12/shop/refurbished/ipad";
  superagent.get(link).end(function (err, sres) {
    if (err) {
      console.log(err);
    }
    let msg = {};

    try {
      msg = getIpadMsg(sres.text);
    } catch (error) {
      msg = {
        title: [],
      };
    }
    if (!msg.tiles) {
      msg.tiles = [];
    }
    // 讯息短截取
    let fn = (item) => {
      let url = item.productDetailsUrl;
      let a = {
        title: item.title,
        dimensionCapacity: item.filters.dimensions.dimensionCapacity,
        price: item.price.currentPrice.amount,
        buyUrl:
          "https://www.apple.com.cn/shop/product" +
          url.split("?")[0].split("shop/product")[1],
      };
      return a;
    };
    // 信息拼接
    let fn1 = (items, title) => {
      return items
        .map((item) => {
          let str = "";
          str = Object.values(item).reduce((a, b) => {
            if (b.indexOf("http") != -1) {
              b = `<a href="${b}">"${b}"</a>`;
            }
            return a + b + "<br />";
          }, "");
          return str;
        })
        .reduce((a, b) => {
          return a + "<p>" + b + "\n\n\n" + "</p>";
        }, `<h2>${title}</h2>`);
    };
    let ipad11 = msg.tiles
      .filter((item) => {
        return item.filters.dimensions.refurbClearModel == "ipadpro_11";
      })
      .map(fn);
    let ipad129 = msg.tiles
      .filter((item) => {
        return item.filters.dimensions.refurbClearModel == "ipadpro_12_9";
      })
      .map(fn);
    let ipadmini5 = msg.tiles
      .filter((item) => {
        return item.filters.dimensions.refurbClearModel == "ipadmini5";
      })
      .map(fn);
    let ipadair = msg.tiles
      .filter((item) => {
        return item.filters.dimensions.refurbClearModel == "ipad5gen";
      })
      .map(fn);
    // ipad 配件
    let ipadaccessories = msg.tiles
      .filter((item) => {
        return item.filters.dimensions.refurbClearModel == "ipadaccessories";
      })
      .map(fn);
    console.log(ipad129, ipad11, ipadmini5, ipadair, ipadaccessories);

    let sendMsg = ipad129;

    // let text = fn1(sendMsg, '订阅的信息有了')
    // console.log(text)
    if (ipad11.length) {
      let text = fn1(ipad11, "ipad 已经上了翻新机器了");
      if (text != oldSendMsg1) {
        console.log("我想买的有货了", JSON.stringify(sendMsg));
        oldSendMsg1 = text;
        sendmail({
          html: text,
          subject: "ipad 11 pro 更新了",
        });
      }
    }
    if (ipadaccessories.length) {
      let text = fn1(ipadaccessories, "ipad 配件有翻新了");
      if (text != oldSendMsg2) {
        oldSendMsg2 = text;
        sendmail({
          html: text,
          subject: "ipad 有配件上翻新了",
        });
      }
    }
    // if(ipad129.length){
    //   let text = fn1(ipad129, "ipad 配件有翻新了");
    //   if(text != oldSendMsg3){
    //     oldSendMsg3 = text
    //     sendmail({
    //       html: text,
    //       subject: "ipad 12.9 上翻新了",
    //     });
    //   }
    // }
    // sendmail({
    //   html:text
    // })
  });
}

//抓取的内容发送QQ邮箱(是为了每次抓取的内容都发送邮箱);
let transporter = nodemailer.createTransport({
  service: "qq",
  auth: {
    user: "1591173911@qq.com", //邮箱登录账号
    pass: "eoooqwmrpvrdggfc", //使用QQ邮箱登录密码是不正确的，必须使用QQ邮箱里的授权码，这个请注意，底部有说明
  },
});
let mailOptions = {
  //发送者
  from: "1591173911@qq.com",
  //接受者，可以同时发送给多个邮箱，以逗号隔开
  to: "18322803026@163.com,huiqianghe183@gmail.com",
  //发送内容的标题
  subject: "ipad 上新款了",
  //内容
  // text: 'Hello world', // 文本
  html: "<h2>ipad 已经上了翻新机器</h2>",
};
//执行发送邮件的函数
function sendmail(param = {}) {
  let sendMsg = { ...mailOptions, ...param };
  console.log(sendMsg.html);
  transporter.sendMail(sendMsg, function (err, info) {
    if (err) {
      console.log("发送失败，失败原因是：" + err);
      return;
    } else {
      console.log("发送成功");
    }
  });
}
// fetchData();

// 定时模块定时启动抓取数据函数函数;
let rule = new schedule.RecurrenceRule();
// let times    = [1,3,5,7,9,11,13,15,17,19,21,23];
// rule.hour  = times;
// rule.minute = 49;
rule.second = [0, 30];
schedule.scheduleJob(rule, function () {
  fetchData();
});
