import nodemailer from "nodemailer";

async function sendEmail({ to, cc, bcc, subject, html, attachments = [] } = {}) {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.gmail, // generated ethereal user
            pass: process.env.gmailPass, // generated ethereal password
        },
    });

    // send mail with defined transport object
    let info = await transporter.sendMail({
        from: `"Route Academy" <${process.env.gmail}>`, // sender address
        to,
        cc,
        bcc,
        subject,
        html,
        attachments
    });

 
    if (info.rejected.length || !info.accepted.length) {
        throw new Error("Email could not be sent: the mail server did not accept all recipients")
    }

    return true
}



export default sendEmail
