//logs.js
const util = require('../../utils/util.js')

Page({
  data: {
    logs: []
  },
  onLoad: function () {
    console.log('log---onLoad');
    wx.showShareMenu({
      withShareTicket: true
    })
    this.setData({
      logs: (wx.getStorageSync('logs') || []).map(log => {
        return util.formatTime(new Date(log))
      })
    })
  },
  onReady() {
    console.log('log---onReady');
  },

  onShow() {
    console.log('log---onShow');
  },

  onHide() {
    console.log('log---onHide');
  },

  onUnload() {
    console.log('log---onUnload');
  },
  onShareAppMessage(res) {
    if (res.from === 'button') {
      // 来自页面内转发按钮
      console.log(res.target)
    }
    return {
      title: '自定义转发标题',
      path: '/pages/user?id=123'
    }
  }
})
