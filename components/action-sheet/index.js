const app = getApp();
Component({
  properties: {
    showMenu: {
      type: Boolean,
      value: false
    },
  },

  data: {
    menu_list:[],
    id:0
  },

  methods: {
    preventDefault() {
      return
    },
    //获取就诊人
    getPatient: function () {
      let that = this;
      app.util.request({
        url: 'entry/wxapp/patient',
        data: {
          op: 'lists',
          type: 1,
        },
        success: function (res) {
          console.log('就诊人列表11：=====',res)
          if (res.data.errno === 0) {
            that.setData({
              menu_list:res.data.data
            });
          } else {
            wx.showModal({
              title: '系统提示',
              content: res.data.message,
              showCancel: false,
            })
          }
        },
        fail: function (err) {
          console.log(err);
        },
      });
    },
    // 切换状态
    onCreateTap: function() {
      this.setData({
        showMenu: !this.data.showMenu
      })
    },
    // 点击选项
    onItemTap: function(event) {
      let id = event.currentTarget.dataset.id;
      let menuEventDetail = event.currentTarget.dataset;
      this.triggerEvent('menuEventDetail', menuEventDetail)
      this.setData({
        id
      })
    },
  },
  attached() {
    this.setData({
      id:app.default_patient.id
    })
    this.getPatient();
  }
})