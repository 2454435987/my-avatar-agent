import nodemailer from "nodemailer";

interface VisitorMessage {
  time: string;
  visitorName: string;
  contact: string;
  content: string;
}

export class Notifier {
  // 1. 发送微信推送通知 (基于免费的 PushPlus 接口)
  static async sendWeChatPush(msg: VisitorMessage) {
    const token = process.env.PUSHPLUS_TOKEN;
    if (!token) {
      // 未配置则跳过
      return;
    }

    try {
      const title = `🔔 你的 AI 分身收到新留言: ${msg.visitorName}`;
      const content = `
        <h3>🤖 吴琦的 AI 分身收到访客新留言！</h3>
        <p><b>访客姓名：</b> ${msg.visitorName}</p>
        <p><b>联系方式：</b> ${msg.contact}</p>
        <p><b>留言时间：</b> ${msg.time}</p>
        <p><b>具体内容：</b> ${msg.content}</p>
      `;

      const response = await fetch("http://www.pushplus.plus/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token,
          title: title,
          content: content,
          template: "html",
        }),
      });

      const resJson: any = await response.json();
      if (resJson.code === 200) {
        console.log(`[通知系统] 微信推送成功！`);
      } else {
        console.warn(`[通知系统] 微信推送返回:`, resJson.msg);
      }
    } catch (err: any) {
      console.error(`[通知系统] 微信推送异常:`, err.message);
    }
  }

  // 2. 发送邮件通知 (支持 QQ 邮箱 / 163 邮箱)
  static async sendEmailNotice(msg: VisitorMessage) {
    const user = process.env.EMAIL_USER; // 你的发件邮箱 (例如 xxx@qq.com)
    const pass = process.env.EMAIL_PASS; // 邮箱授权码 (不是登录密码)
    const to = process.env.EMAIL_TO || user; // 接收邮箱 (默认发给自己)

    if (!user || !pass) {
      // 未配置则跳过
      return;
    }

    try {
      console.log(`[通知系统] 正在准备发送 QQ 邮件至 ${to}...`);
      const transporter = nodemailer.createTransport({
        host: "smtp.qq.com",
        port: 465,
        secure: true, // 使用 465 SSL 端口
        auth: { user, pass },
      });

      const info = await transporter.sendMail({
        from: `"AI 数字分身助手" <${user}>`,
        to: to,
        subject: `【新访客留言】来自 ${msg.visitorName} 的联系请求`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #0284c7;">🤖 你的个人数字分身有新留言啦！</h2>
            <p><strong>访客称呼：</strong> ${msg.visitorName}</p>
            <p><strong>联系方式：</strong> <span style="color: #e11d48; font-weight: bold;">${msg.contact}</span></p>
            <p><strong>留言时间：</strong> ${msg.time}</p>
            <hr style="border: none; border-top: 1px dashed #ccc; margin: 15px 0;" />
            <p><strong>留言意向与需求：</strong></p>
            <blockquote style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 10px 15px; margin: 0;">
              ${msg.content}
            </blockquote>
          </div>
        `,
      });

      console.log(`[通知系统] ✅ QQ 邮件发送成功！MessageId: ${info.messageId}`);
    } catch (err: any) {
      console.error(`[通知系统] ❌ 邮件发送失败:`, err.message);
    }
  }

  // 统一触发所有已配置的通知
  static async notify(msg: VisitorMessage) {
    await Promise.allSettled([
      this.sendWeChatPush(msg),
      this.sendEmailNotice(msg),
    ]);
  }
}
