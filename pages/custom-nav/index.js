const app = getApp();
Page({

  data: {

  },

  onLoad: function (options) {

  },
  back(e){
    console.log('触发组件返回事件--',e.detail)
  },
  home(e) {
    console.log('触发返回首页事件--', e.detail)
  },
  
  onReady: function () {

  },

  onShow: function () {

  },

  onPullDownRefresh: function () {
    console.log('刷新')
  },

  onReachBottom: function () {

  },

  onShareAppMessage: function () {

  }
})