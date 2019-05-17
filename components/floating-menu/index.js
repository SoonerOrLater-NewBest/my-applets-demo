const app = getApp();
Component({
  properties: {
    menu_list: {
      type: Array,
      value: [{
        id: 1,
        name: '回首页',
        src: '../../resource/images/nav/home-off.png',
        href: '/ws_house/pages/index/index'
      }, {
        id: 2,
        name: '客服',
        src: '../../resource/images/user/user-08.png',
        href: ''
      }]
    },
  },

  data: {
    showMenu: false
  },

  methods: {
    preventDefault() {
      return
    },
    // 点击新建按钮
    onCreateTap: function() {
      this.setData({
        showMenu: !this.data.showMenu
      })
    },
    // 点击展开的单个按钮
    onItemTap: function(event) {
      let url = event.currentTarget.dataset.url;
      if (url) {
        app.util.navigateTo(url);
      }
      // var menuEventDetail = {
      //   item
      // }
      // this.triggerEvent('handleMenu', menuEventDetail)

    }
  }
})