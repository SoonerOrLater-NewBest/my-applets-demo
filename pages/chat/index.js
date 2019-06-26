/**
 * 支持实时通信，但不希望整个list重新渲染。
 * 用historyMessages渲染历史消息，用newMessages渲染实时消息；
 */
let regeneratorRuntime = require('../../utils/vendor/runtime.js'); // 支持async await
const app = getApp();

let socketOpen = false;
let socketMsgQueue = [];

let recorder = wx.getRecorderManager();
const innerAudioContext = wx.createInnerAudioContext(); // 获取播放对象
Page({
  data: {
    limit: 10,
    guestInfo: null,
    historyMessages: [],
    newMessages: [],
    inputValue: '',
    needMoreMedia: true,
    showMediaArea: false,
    inputBarBottom: 0,
    scrollTop: 0,
    targetId: '',
    toOpenid: '', // 给对方留言时，对方的openid。
    myOpenid: '',
    imagesUrl: [],
    page: 1,
    len: null,
    is_first: true,
    is_onLine: true,
    isIpx: 0,
    isAudio: false,
    cancleRecording: false, // 是否取消录音
    voice_icon_click: false,
    action_height: 360,
  },
  // 语音输入切换
  textToAudio() {
    this.setData({
      isAudio: !this.data.isAudio,
    });
  },
  // 播放录音
  my_audio_click: function (e) {
    console.log('my_audio_click执行了', e);
    let src = e.currentTarget.dataset.src;
    console.log('url地址', src);
    innerAudioContext.src = src;
    innerAudioContext.seek(0);
    innerAudioContext.play();
  },
  // 向上滑动取消录音 
  moveToCancle(e) {
    let moveLenght = e.touches[e.touches.length - 1].clientY - this.data.startPoint.clientY; // 移动距离
    if (Math.abs(moveLenght) > 50) {
      // 触发了上滑取消发送
      this.setData({
        cancleRecording: true,
      });
    } else {
      // 上划距离不足，依然可以发送
      this.setData({
        cancleRecording: false,
      });
    }

  },
  // 录音监听事件
  on_recorder: function () {
    let that = this;
    recorder.onStart((res) => {
      console.log('开始录音');
    });
    recorder.onStop((res) => {
      if (that.data.cancleRecording) {
        that.setData({
          cancleRecording: false,
        });
        return console.log('录音已取消');
      }
      console.log('停止录音,临时路径', res.tempFilePath);
      // _tempFilePath = res.tempFilePath;
      let x = new Date().getTime() - this.data.voice_ing_start_date;
      // let length = Math.ceil(x / 1000);
      if (x > 1000) {
        let newMessage = {
          type: 'audio',
          role: 1,
          avatar: that.data.avatarUrl,
          nickname: that.data.nickName,
          content: res.tempFilePath,
          publishTime: Date.now(),
        };
        that.setData({
          newMessages: [...that.data.newMessages, newMessage],
        });
        that.pageScrollToBottom();
        let url = util.url('utility/file/upload', {
          type: 'audio',
          thumb: '0',
        });
        new Promise(function (resolve, reject) {
          wx.uploadFile({
            url,
            filePath: res.tempFilePath,
            name: 'file',
            success: res => {
              let data = JSON.parse(res.data);
              resolve(data.url);
            },
            fail: res => {
              reject(res);
            },
          });
        }).then(function (data) {
          console.log('上传后返回的服务器音频地址：---', data);
          that.sendNewMessage(data, 'audio').then(function (res) {
            if (res) {
              let socketMsg = {
                uid: that.data.myOpenid,
                to: that.data.toOpenid,
                msg: data,
                contentType: 'audio',
                type: 1,
                custom: {
                  avatar: that.data.avatarUrl,
                },
              };
              that.sendSocketMessage(JSON.stringify(socketMsg));
            }
          });
        }).catch(function (res) {
          wx.showModal({
            title: '温馨提示',
            content: '上传失败，请重新发送',
            showCancel: false,
            success: function () {
              // that.setData({
              // });
            },
          });
        });
      }
    });
    // 指定帧录制完成回调
    // recorder.onFrameRecorded((res) => {
    //   var x = new Date().getTime() - this.data.voice_ing_start_date
    //   if (x > 1000) {
    //     console.log('onFrameRecorded  res.frameBuffer', res.frameBuffer);
    //     string_base64 = wx.arrayBufferToBase64(res.frameBuffer)

    //     // console.log('string_base64--', wx.arrayBufferToBase64(string_base64))
    //     if (res.isLastFrame) {
    //       that.session_pro.then(function (session) {
    //         var data = {
    //           audioType: 3,
    //           cmd: 1,
    //           type: 2,
    //           signType: 'BASE64',
    //           session: session,
    //           body: string_base64,
    //         }
    //         console.log('that.data.allContentList', that.data.allContentList)
    //         sendSocketMessage(data)
    //       })
    //       // 进行下一步操作
    //     } else {
    //       that.session_pro.then(function (session) {
    //         var data = {
    //           cmd: 1,
    //           audioType: 2,
    //           type: 2,
    //           signType: 'BASE64',
    //           session: session,
    //           body: string_base64
    //         }
    //         console.log('录音上传的data:', data)
    //         sendSocketMessage(data)
    //       })
    //     }
    //   }
    // })
  },
  // 手指点击录音
  voice_ing_start: function (e) {
    let that = this;
    innerAudioContext.stop();
    this.setData({
      startPoint: e.touches[0], // 记录长按时开始点信息，后面用于计算上划取消时手指滑动的距离
      voice_ing_start_date: new Date().getTime(), // 记录开始点击的时间
      voice_icon_click: true,
    });
    const options = {
      duration: 10000, // 指定录音的时长，单位 ms
      sampleRate: 16000, // 采样率
      numberOfChannels: 1, // 录音通道数
      encodeBitRate: 24000, // 编码码率
      format: 'mp3', // 音频格式，有效值 aac/mp3
      frameSize: 12, // 指定帧大小，单位 KB
    };
    recorder.start(options); // 开始录音

    this.animation = wx.createAnimation({
      duration: 1200,
    }); // 播放按钮动画
    that.animation.scale(0.8, 0.8); // 还原
    that.setData({
      spreakingAnimation: that.animation.export(),
    });
  },
  // 手指松开录音
  voice_ing_end: function () {
    let that = this;
    that.setData({
      voice_icon_click: false,
      animationData: {},
    });
    this.animation = '';
    let x = new Date().getTime() - this.data.voice_ing_start_date;
    if (x < 1000) {
      console.log('录音停止，说话小于1秒！');
      wx.showModal({
        title: '提示',
        content: '说话时间太短！',
      });
      recorder.stop();
    } else {
      // 录音停止，开始上传
      recorder.stop();
    }
  },

  consult(consult_id) {
    let that = this;
    app.util.request({
      url: 'entry/wxapp/consult',
      data: {
        op: 'consultDetail',
        consult_id,
      },
      success(res) {
        console.log('consult', res);
        let baseInfo = res.data.data;
        let myOpenid; let avatarUrl; let nickName; let toOpenid; let toavatar; let 
          tonickname;
        let action_height = 360;
        if (baseInfo.reply_ident == 2) {
          toOpenid = baseInfo.im_doctor_sign;
          toavatar = baseInfo.doctor_avatar || '../../image/yisheng.png';
          tonickname = baseInfo.doctor_nickname;
          myOpenid = baseInfo.im_patient_sign;
          avatarUrl = baseInfo.patient_avatar || '../../image/huanzhe.png';
          nickName = baseInfo.patient_nickname;
        } else {
          action_height = 200;
          toOpenid = baseInfo.im_patient_sign;
          toavatar = baseInfo.patient_avatar || '../../image/huanzhe.png';
          tonickname = baseInfo.patient_nickname;
          myOpenid = baseInfo.im_doctor_sign;
          avatarUrl = baseInfo.doctor_avatar || '../../image/yisheng.png';
          nickName = baseInfo.doctor_nickname;
        }
        // wx.setNavigationBarTitle({
        //   title: tonickname,
        // });
        that.setData({
          action_height,
          baseInfo,
          myOpenid,
          avatarUrl,
          nickName,
          toOpenid,
          toavatar,
          tonickname,
          reply_ident: baseInfo.reply_ident,
          status: baseInfo.status,
          comment: baseInfo.comment,
          pay_status: baseInfo.pay_status,
        }, () => {
          that.consultReplyMsgCardCategory();
        });
      },
    });
  }, 
  // 获取卡片信息配置
  consultReplyMsgCardCategory() {
    let that = this;
    app.util.request({
      // cachetime: 600,
      url: 'entry/wxapp/consult',
      data: {
        op: 'consultReplyMsgCardCategory',
      },
      success(res) {
        let cardType = res.data.data || '';
        if (cardType) {
          let { id, doctor_department_name, doctor_name, reply_ident } = that.data.baseInfo;
          cardType.summary.url = `ws_medical_new/pages/advisory/index?id=${id}&doctor_department_name=${doctor_department_name}&doctor_name=${doctor_name}`;
          cardType.medication_reg.url = `ws_medical_new/pages/medication/index?id=${id}`;
        }
        that.setData({
          cardType,
        });
      },
    });
  },
  onLoad: function (options) {
    let isForm = options.form || false;
    let consult_id = options.consult_id;
    this.consult(consult_id);
    let that = this;
    let isIpx = app.isIpx ? 68 : 0;
    this.setData({
      consult_id,
      isIpx,
      isForm,
    });

    // 从web服务器加载历史消息
    app.util.request({
      url: 'entry/wxapp/consult',
      data: {
        op: 'consultReplyMsgList',
        consult_id: consult_id,
        page: this.data.page,
      },
      success(res) {
        console.log('从web服务器加载历史消息', res);
        if (res.data.errno === 0) {
          const messages = res.data.data;
          that.setData({
            historyMessages: [...that.data.historyMessages, ...messages],
          });
          // 滚动至页面底部
          setTimeout(function () {
            let lastMsg = `#msg-h${that.data.historyMessages.length - 1}`;
            wx.createSelectorQuery().select(lastMsg).boundingClientRect(function (rect) {
              that.setData({
                targetId: lastMsg.slice(1),
              });
            }).exec();
          }, 1000);
        }
      },
    });
    this.on_recorder();
  },

  // 进入页面，连接socket。
  onShow: function () {
    this.linkSocket();
  },

  // 退出页面时关闭socket
  onUnload: function () {
    wx.closeSocket({
      success: res => {
        console.log(res);
      },
    });
    wx.onSocketClose(function (res) {
      console.log('WebSocket 已关闭！');
    });
  },

  // 连接socket服务器 如果连接失败，可询问谌威。
  linkSocket() {
    let that = this;
    const url = 'wss://socket-v8.wshoto.com';
    // const url = app.siteInfo.socketurl;
    wx.connectSocket({
      url: url,
      success(res) {
        console.log('连接成功', res);
        that.initEventHandle();
      },
    });
  },

  // 通过 WebSocket 连接发送数据，需要先 wx.connectSocket，并在 wx.onSocketOpen 回调之后才能发送。
  sendSocketMessage: function (msg) {
    if (socketOpen) {
      let msgs = JSON.parse(msg);
      let type = msgs['contentType'];
      // this.send_msg_new(msgs['msg'], type);
      wx.sendSocketMessage({
        data: msg,
      });
    } else {
      socketMsgQueue.push(msg);
    }
  },

  send_msg_new: function (msg, type) {
    if (msg !== 'login') {

    }

  },

  // 消息处理
  initEventHandle() {
    let that = this;
    wx.onSocketMessage((res) => {
      console.log('监听接收信息', JSON.parse(res.data));
      const {
        type,
        contentType,
        content,
        custom,
        status = {},
      } = JSON.parse(res.data);
      const {
        toOpenid,
        myOpenid,
      } = that.data;
      let newMessage = {};
      switch (type) { // 根据返回数据的type判断消息类型，做相应处理。
        case 0: // socket 登录
          console.log('Login success!');
          if (status && status.type && status.type == 3) {
            that.setData({
              is_onLine: false,
            });
          }
          break;
        case 1: // 一般的消息收发
          console.log('消息处理', res.data);
          // oppositeOn = true;
          newMessage = {
            id: '',
            uniacid: '',
            m_id: '',
            openid: '',
            type: contentType,
            content: content,
            createtime: '',
            nickname: '',
            avatar: custom.avatar,
            self: 0,
          };
          that.setData({
            newMessages: [...that.data.newMessages, newMessage],
          });
          that.pageScrollToBottom();
          break;
        case 2:
          // 心跳检测的返回值;目前由服务端实现重连。
          break;
        case 3: // 对方不在线，请求后端发送模板消息，此功能需要与后端协调。
        // oppositeOn = false;
      }
    });

    wx.onSocketOpen(() => {
      console.log('WebSocket连接打开');
      socketOpen = true;
      let loginMsg = {
        type: 0,
        uid: that.data.myOpenid,
        to: that.data.toOpenid,
        msg: 'login',
        contentType: 0,
      };
      console.log(loginMsg);
      that.sendSocketMessage(JSON.stringify(loginMsg));
    });

    wx.onSocketError(function (res) {
      console.log('WebSocket连接打开失败', res);
      socketOpen = false;
      that.linkSocket();
    });

    wx.onSocketClose(function (res) {
      console.log('WebSocket 已关闭！');
      socketOpen = false;
      that.linkSocket();
    });
  },

  stopInput(event) {
    if (this.data.inputValue.length > 0) {
      this.setData({
        needMoreMedia: false,
      });
    } else {
      this.setData({
        needMoreMedia: true,
      });
    }

  },

  inputHandler(event) {
    const inputData = event.detail.value;
    if (inputData != '') {
      this.setData({
        needMoreMedia: false,
        inputValue: inputData,
      });
    } else {
      this.setData({
        needMoreMedia: true,
        inputValue: inputData,
      });
    }

  },

  // 发送文本留言
  sendMessage: function (e) {
    console.log(e);
    const that = this;
    // const content = e.detail.value.textarea;
    const content = e.detail.value;
    if (!content) return;
    const formid = e.detail.formId || '';
    const nickName = this.data.nickName;
    const avatarUrl = this.data.avatarUrl;
    // app.util.request({
    //   url: 'pushService/api/formid',
    //   data: {
    //     openid: that.data.myOpenid,
    //     formid,
    //   },
    //   method: 'GET',
    //   success: res => {
    //     console.log(`formid收集成功 ${res}`);
    //   },
    //   fail: res => {
    //     console.log(`formid收集失败 ${res}`);
    //   },
    // });
    let newMessage = {
      type: 'text',
      self: 1,
      avatar: avatarUrl,
      nickname: nickName,
      content: content,
      publishTime: Date.now(),
      images: [],
    };

    this.setData({
      newMessages: [...this.data.newMessages, newMessage],
      inputValue: '',
      needMoreMedia: true,
    });

    this.pageScrollToBottom();

    this.sendNewMessage(newMessage.content, 'text', formid).then(function (res) {
      if (res) {
        let socketMsg = {
          uid: that.data.myOpenid,
          to: that.data.toOpenid,
          msg: content,
          contentType: 'text',
          type: 1,
          custom: {
            avatar: avatarUrl,
          },

        };
        console.log('开始发送socket消息');
        that.sendSocketMessage(JSON.stringify(socketMsg));
      }
    });


  },

  // 显示图片选择区域
  showMoreMedia(event) {
    this.setData({
      showMediaArea: true,
      inputBarBottom: this.data.action_height,
    });
  },

  // 隐藏图片选择区域
  hideMediaArea(event) {
    if (this.data.showMediaArea) {
      this.setData({
        showMediaArea: false,
        inputBarBottom: 0,
      });
    }
  },

  // 选择图片，更新newMessages，并发送至服务器。
  // TODO:发图片时获取formid。
  chooseImage(event) {
    const that = this;
    const nickName = this.data.nickName;
    const avatarUrl = this.data.avatarUrl;
    const {
      formid,
    } = this.data;

    wx.chooseImage({
      count: 3,
      success: function (res) {
        let newMessage = {
          type: 'image',
          role: 1,
          avatar: avatarUrl,
          nickname: nickName,
          content: res.tempFilePaths,
          publishTime: Date.now(),
        };
        that.setData({
          newMessages: [...that.data.newMessages, newMessage],
          showMediaArea: true,
          inputBarBottom: this.data.action_height,
        });
        that.pageScrollToBottom();
        that.setData({
          imagesUrl: [],
        });
        let url = 'utility/file/upload';
        if (url.indexOf('http://') == -1 && url.indexOf('https://') == -1) {
          url = util.url(url, {
            type: 'image',
            thumb: '0',
          });
        }
        new Promise(function (resolve) {
          resolve();
        }).then(() => {
          new Promise(function (resolve) {
            let flag = 0;
            res.tempFiles.forEach((item, index, arr) => {
              wx.uploadFile({
                url,
                filePath: item.path,
                name: 'file',
                success: function (res) {
                  if (!that.isJSON(res.data)) {
                    console.log('返回数据格式有误');
                    return;
                  } else {
                    flag++;
                    let data = JSON.parse(res.data);
                    console.log(data.url);
                    that.setData({
                      imagesUrl: [...that.data.imagesUrl, data.url],
                    }, () => {
                      if (flag === arr.length) resolve();
                    });
                  }
                },
              });
            });
          }).then(() => {
            that.sendNewMessage(that.data.imagesUrl, 'image', formid).then(function (res) {
              if (res) {
                let socketMsg = {
                  uid: that.data.myOpenid,
                  to: that.data.toOpenid,
                  msg: that.data.imagesUrl,
                  contentType: 'image',
                  type: 1,
                  custom: {
                    avatar: avatarUrl,
                  },
                };
                that.sendSocketMessage(JSON.stringify(socketMsg));
              }
            });
          });
        });
      },
    });

  },

  // 发送最新留言至服务器
  sendNewMessage: function (msg, type, formid = '') {
    const that = this;
    let reply_con = msg;
    if (type != 'card') {
      reply_con = encodeURIComponent(msg);
    }
    const {
      consult_id,
      is_first,
      is_onLine,
      reply_ident,
    } = this.data;
    // !is_onLine && is_first && app.util.request({
    //   url: 'entry/wxapp/chatRemind',
    //   data: {
    //     time: Date.now(),
    //     toopenid: toOpenid,
    //     content: msg,
    //     type,
    //     openid: myOpenid,
    //   },
    //   method: 'GET',
    //   success(res) {
    //     if (res.data.errno === 0) {
    //       console.log('对方不在线且第一次，发送模板消息成功');
    //       that.setData({
    //         is_first: false
    //       })
    //     } else {
    //       console.log('发送模板消息失败');
    //     }
    //   },
    // });
    return new Promise(function (resolve, reject) {
      app.util.request({
        url: 'entry/wxapp/consult',
        data: {
          op: 'consultReplyMsg',
          reply_con,
          reply_type: type,
          consult_id,
          reply_ident,
          formid,
        },
        success(res) {
          if (res.data.errno === 0) {
            resolve(true);
          } else {
            console.log('发送失败');
            reject(new Error('send msg failed'));
          }
        },
      });

    });
  },

  // 滚动至页面底部
  pageScrollToBottom: function () {
    const that = this;
    let lastMsg = `#msg${this.data.newMessages.length - 1}`;
    wx.createSelectorQuery().select(lastMsg).boundingClientRect(function (rect) {
      that.setData({
        targetId: lastMsg.slice(1),
      });

    }).exec();

  },

  previewImg(e) {
    const {
      currentSrc,
      imagesSrc,
    } = e.currentTarget.dataset;
    wx.previewImage({
      // current: currentSrc,
      urls: [imagesSrc],
    });
  },

  // 发送图片时获取formid。
  getFormId(e) {
    const formid = e.detail.formId;
    app.formSubmit_collect(formid);
    this.setData({
      formid,
    });
  },

  isJSON: function (str) {
    if (typeof str === 'string') {
      try {
        JSON.parse(str);
        return true;
      } catch (e) {
        return false;
      }
    }
  },
  // onPageScroll: function (e) {
  //   if (e.scrollTop < 0) {
  //     wx.pageScrollTo({
  //       scrollTop: 0
  //     })
  //   }
  // },
  uper: function () {
    if (this.data.len == 0) return false;
    let that = this;
    let page = ++this.data.page;
    this.setData({
      page,
    });
    app.util.request({
      url: 'entry/wxapp/consult',
      data: {
        op: 'consultReplyMsgList',
        consult_id: this.data.consult_id,
        page,
      },
      success(res) {
        if (res.data.errno === 0) {
          wx.showLoading({
            title: '加载中',
          });
          let messages = res.data.data;
          that.setData({
            historyMessages: [...messages, ...that.data.historyMessages],
            // targetId:'msg-h0',
            len: messages.length,
          });
          setTimeout(function () {
            wx.hideLoading();
          }, 1000);
        }
      },
    });
  },
  async stopChat() {
    let _that = this;
    let content;
    let len = _that.data.status;
    len = await this.checkStatus();
    if (len === 0) {
      content = '医生暂未回复，若确认结束后，咨询费用将不会退换（若医生超时未回复，则系统默认取消订单并将相关费用退还），请问是否确认取消？';
    } else {
      content = '结束后将不能再发送消息';
    }
    wx.showModal({
      title: '确定结束咨询吗？',
      content: content,
      success(res) {
        if (res.confirm) {
          _that.finished();
          // wx.closeSocket({
          //   success: res => {
          //     console.log(res);
          //   },
          // });
          // wx.onSocketClose(function (res) {
          //   console.log('WebSocket 已关闭！');
          // });
        }
      },
    });
  },
  // 检查订单状态
  checkStatus() {
    let that = this;
    return new Promise(function (resolve, reject) {
      app.util.request({
        url: 'entry/wxapp/consult',
        data: {
          op: 'consultNowStatus',
          consult_id: that.data.consult_id,
        },
        success: function (res) {
          if (res.data.errno === 0) {
            resolve(res.data.data);
          }
        },
        fail: function (err) {
          reject(err);
        },
      });
    });
  },
  // 结束订单咨询
  finished() {
    let that = this;
    app.util.request({
      url: 'entry/wxapp/consult',
      data: {
        op: 'consultClose',
        consult_id: that.data.consult_id,
      },
      success: function (res) {
        if (res.data.errno === 0) {
          wx.showToast({
            title: '已结束',
          });
          that.consult(that.data.consult_id);
        }
      },
      fail: function (err) {
        console.log(err);
      },
    });
  },

  // 去个人中心
  goCenter() {
    app.util.navigateTo('ws_medical_new/pages/register/register');
  },


  // 前去评价
  goAssess() {
    let id = this.data.baseInfo.id;
    let doctor_id = this.data.baseInfo.doctor_id;
    app.util.navigateTo('/ws_medical_new/pages/doctor_evaluate/doctor_evaluate', {
      id,
      doctor_id,
      type: 1,
    });
  },
  // 继续咨询(复诊)
  again() {
    let consult_id = this.data.baseInfo.id;
    let doctor_id = this.data.baseInfo.doctor_id;
    app.util.navigateTo('/ws_medical_new/pages/interrogation/review', {
      consult_id,
      doctor_id,
    });
  },
  // 打电话
  mbCall() {
    wx.makePhoneCall({
      phoneNumber: '1340000',
    });
  },
  // 催回复
  getRespond() {
    let that = this;
    app.util.request({
      url: 'entry/wxapp/consult',
      data: {
        op: 'consultUrgentReply',
      },
      success(res) {
        if (res.data.errno === 0) {
          wx.showToast({
            title: res.data.message || '未知错误',
          });
        }
      },
      fail(err) {
        wx.showToast({
          title: err.data.message || '未知错误',
          icon: 'none',
        });
      },
    });
  },
  // 进入候诊室
  goVideo() {
    app.util.navigateTo('/cm_video_alarm/trtc/pages/medical/room/room', {
      id: this.data.baseInfo.id,
    });
  },
  // 开具处方
  prescribe() {
    let consult_id = this.data.consult_id;
    app.util.navigateTo('ws_medical_new/pages/medication/index', { consult_id });
  },
  // 去写总结
  goAdvisory() {
    let { id, doctor_department_name, doctor_name, reply_ident } = this.data.baseInfo;
    app.util.navigateTo('/ws_medical_new/pages/advisory/index', {
      id,
      doctor_department_name,
      doctor_name,
      reply_ident,
    });
  },
  // 获取我的报告列表
  getReport() {
    let consult_id = this.data.consult_id;
    app.util.navigateTo('ws_medical_new/pages/interpretation/index', { consult_id });
  },
  // 获取卡片类型
  getCard(e) {
    let type = e.currentTarget.dataset.type;
    this.sendCard(type);
  },
  // 发送卡片信息
  sendCard(type) {
    const that = this;
    let content = this.data.cardType[`${type}`] || '';
    if (!content) return;
    const nickName = this.data.nickName;
    const avatarUrl = this.data.avatarUrl;
    let newMessage = {
      type: 'card',
      self: 1,
      avatar: avatarUrl,
      nickname: nickName,
      content: content,
      publishTime: Date.now(),
    };
    this.setData({
      newMessages: [...this.data.newMessages, newMessage],
    });
    this.pageScrollToBottom();
    this.sendNewMessage(content, 'card').then(function (res) {
      if (res) {
        let socketMsg = {
          uid: that.data.myOpenid,
          to: that.data.toOpenid,
          msg: content,
          contentType: 'card',
          type: 1,
          custom: {
            avatar: avatarUrl,
          },

        };
        console.log('开始发送socket消息');
        that.sendSocketMessage(JSON.stringify(socketMsg));
      }
    });
    this.hideMediaArea();
  },
  cardAction(e) {
    let reply_ident = this.data.reply_ident;
    let url = e.currentTarget.dataset.url;
    if (url) {
      let check = url.indexOf('?');
      if(check!=-1){
        url = url + '&reply_ident=' + reply_ident;
      }else{
        url = url + '?reply_ident=' + reply_ident;
      }
      app.util.navigateTo(url);
    }
  },
});