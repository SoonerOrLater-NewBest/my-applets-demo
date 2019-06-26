
//index.js
//获取应用实例
const app = getApp();
import { wxPromisify } from '../../utils/util.js';
// 设置全局分享开关
wx.onAppShow(function (res) {
  app.wsHouseIsShare = false;
  if (res.scene === 1044 || res.scene === 1007) {
    app.wsHouseIsShare = true;
  }
  console.log(app.wsHouseIsShare);
});
Page({
  data: {
    motto: 'Hello World',
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo')
  },
  //事件处理函数
  bindViewTap: function () {
    wx.navigateTo({
      url: '../logs/logs?hahaha=哈哈哈'
    })
  },
  onLoad: function () {
    console.log('page---onLoad');
    wx.showShareMenu({
      withShareTicket: true
    })
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      })
    } else if (this.data.canIUse) {
      // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
      // 所以此处加入 callback 以防止这种情况
      app.userInfoReadyCallback = res => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    } else {
      // 在没有 open-type=getUserInfo 版本的兼容处理
      wx.getUserInfo({
        success: res => {
          app.globalData.userInfo = res.userInfo
          this.setData({
            userInfo: res.userInfo,
            hasUserInfo: true
          })
        }
      })
    }
  },
  getUserInfo: function (e) {
    console.log(e)
    app.globalData.userInfo = e.detail.userInfo
    this.setData({
      userInfo: e.detail.userInfo,
      hasUserInfo: true
    })
  },
  // onLoad(options) {
  //   console.log('page---onLoad');
  // },

  onReady() {
    console.log('page---onReady');
  },

  onShow() {
    console.log('page---onShow');
  },

  onHide() {
    console.log('page---onHide');
  },

  onUnload() {
    console.log('page---onUnload');
  },
  jump(){
    wx.navigateTo({
      url: '/pages/custom-nav/index',
    })
  },
  onShareAppMessage(res) {
    if (res.from === 'button') {
      // 来自页面内转发按钮
      console.log(res.target)
    }
    return {
      title: '自定义转发标题',
      path: '/pages/logs/logs?id=123',
    }
  }

})