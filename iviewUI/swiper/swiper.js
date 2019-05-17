Component({
  data: {
    autoplay: true,
    interval: 3000,
    duration: 1000,
    hide: true, 
    swiperCurrent: 0,
    swiperIndex:0
  },
  properties: {
    piclist: {
      type: Array,
      value: [],
    },
    data: {
      type: Object,
      value: {},
    },
  },
  methods: {
    play(e) {
      this.setData({
        hide: false,
        autoplay: false,
      });
      let videoContext = wx.createVideoContext('video', this);
      videoContext.play();
    },
    close(e) {
      this.setData({
        hide: true,
        autoplay: true,
      });
      let videoContext = wx.createVideoContext('video', this);
      videoContext.pause();
    },
    see_vr() {
      let content = this.data.data;
      wx.navigateTo({
        url: `/ws_house/pages/web/web?url=${content.vr_url}`,
      });
    },
    swiperNav(e) {
      this.setData({
        swiperCurrent: e.currentTarget.dataset.idx,
        autoplay: false,
      });
    },
    swiperChange: function (e) {
      let current = e.detail.current;
      this.setData({
        swiperIndex: current,
      });
      
    },
    tapPreviewImage: function (e) {
      wx.previewImage({
        current: e.currentTarget.dataset.src, // 当前显示图片的http链接
        urls: this.properties.piclist, // 需要预览的图片http链接列表
      });
    },
  },
});