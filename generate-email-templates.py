#!/usr/bin/env python3
"""
Email Template Translation Generator
Translates English email templates to 9 other languages
"""

import os
import re
from pathlib import Path

# Language mappings
LANGUAGES = {
    'de': 'German',
    'fil': 'Filipino',
    'fr': 'French',
    'id': 'Indonesian',
    'it': 'Italian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'th': 'Thai',
    'vi': 'Vietnamese'
}

# Templates to translate
TEMPLATES = [
    'booking-confirmed-patient.html',
    'booking-confirmed-psychologist.html',
    'verification-approved.html',
    'verification-rejected.html',
    'appointment-cancelled.html'
]

# Translation dictionaries for each template and language
TRANSLATIONS = {
    'booking-confirmed-patient.html': {
        'de': {
            'lang': 'de',
            'title': 'Termin Bestätigt - KhunJit',
            'header_title': '✅ Termin Bestätigt!',
            'header_subtitle': 'Ihre Therapiesitzung ist bereit',
            'greeting': 'Hallo {{firstName}}, Sie sind bereit! 🎉',
            'intro': 'Ihr Termin mit <strong style="color: #111827;">{{psychologistName}}</strong> wurde bestätigt. Wir freuen uns darauf, Sie auf Ihrer psychischen Gesundheitsreise zu unterstützen.',
            'psychologist_label': '👨‍⚕️ Ihr Psychologe',
            'date_label': '📅 Datum',
            'time_label': '🕐 Uhrzeit',
            'tips_title': '💡 Tipps für Ihre Sitzung',
            'tips': [
                'Finden Sie einen ruhigen, privaten Ort, an dem Sie sich wohl fühlen',
                'Testen Sie vorher Ihre Kamera und Ihr Mikrofon',
                'Halten Sie ein Glas Wasser bereit',
                'Bereiten Sie Themen oder Fragen vor, die Sie besprechen möchten',
                'Treten Sie 5 Minuten früher bei, um sicherzustellen, dass alles reibungslos funktioniert'
            ],
            'reminder_text': '<strong>⏰ Erinnerungen:</strong> Wir senden Ihnen E-Mail-Erinnerungen 24 Stunden und 1 Stunde vor Ihrer Sitzung. Sie erhalten auch In-App-Benachrichtigungen.',
            'button_view': 'Meine Termine anzeigen',
            'cancellation_title': 'Müssen Sie umplanen?',
            'cancellation_text': 'Sie können Ihren Termin bis zu 24 Stunden im Voraus über Ihr Dashboard stornieren oder ändern.',
            'closing': 'Wenn Sie vor Ihrer Sitzung Fragen oder Bedenken haben, zögern Sie bitte nicht, uns zu kontaktieren.',
            'footer_help': 'Fragen? Wir helfen Ihnen gerne: <a href="mailto:support@khunjit.com" style="color: #10b981; text-decoration: none; font-weight: 600;">support@khunjit.com</a>',
            'footer_copy': '© 2026 KhunJit - Ihre Plattform für psychische Gesundheit'
        },
        'fil': {
            'lang': 'fil',
            'title': 'Nakumpirma ang Appointment - KhunJit',
            'header_title': '✅ Nakumpirma ang Appointment!',
            'header_subtitle': 'Handa na ang iyong therapy session',
            'greeting': 'Hi {{firstName}}, handa ka na! 🎉',
            'intro': 'Ang iyong appointment kay <strong style="color: #111827;">{{psychologistName}}</strong> ay nakumpirma na. Inaasahan namin na suportahan ka sa iyong mental health journey.',
            'psychologist_label': '👨‍⚕️ Ang Iyong Psychologist',
            'date_label': '📅 Petsa',
            'time_label': '🕐 Oras',
            'tips_title': '💡 Mga Tip para sa iyong session',
            'tips': [
                'Maghanap ng tahimik at pribadong lugar kung saan komportable ka',
                'I-test ang iyong camera at microphone nang maaga',
                'Maghanda ng isang baso ng tubig',
                'Ihanda ang mga paksa o tanong na gusto mong pag-usapan',
                'Sumali nang 5 minuto nang maaga upang matiyak na maayos ang lahat'
            ],
            'reminder_text': '<strong>⏰ Mga Paalala:</strong> Magpapadala kami ng email reminders 24 oras at 1 oras bago ang iyong session. Makakatanggap ka rin ng in-app notifications.',
            'button_view': 'Tingnan ang Mga Appointment',
            'cancellation_title': 'Kailangan mag-reschedule?',
            'cancellation_text': 'Maaari mong kanselahin o baguhin ang iyong appointment hanggang 24 oras bago mula sa iyong dashboard.',
            'closing': 'Kung mayroon kang mga tanong o alalahanin bago ang iyong session, huwag mag-atubiling makipag-ugnayan.',
            'footer_help': 'May mga tanong? Nandito kami para tumulong: <a href="mailto:support@khunjit.com" style="color: #10b981; text-decoration: none; font-weight: 600;">support@khunjit.com</a>',
            'footer_copy': '© 2026 KhunJit - Ang Iyong Mental Health Platform'
        },
        'fr': {
            'lang': 'fr',
            'title': 'Rendez-vous Confirmé - KhunJit',
            'header_title': '✅ Rendez-vous Confirmé !',
            'header_subtitle': 'Votre séance de thérapie est prête',
            'greeting': 'Bonjour {{firstName}}, vous êtes prêt ! 🎉',
            'intro': 'Votre rendez-vous avec <strong style="color: #111827;">{{psychologistName}}</strong> a été confirmé. Nous avons hâte de vous soutenir dans votre parcours de santé mentale.',
            'psychologist_label': '👨‍⚕️ Votre Psychologue',
            'date_label': '📅 Date',
            'time_label': '🕐 Heure',
            'tips_title': '💡 Conseils pour votre séance',
            'tips': [
                'Trouvez un espace calme et privé où vous vous sentez à l\'aise',
                'Testez votre caméra et votre microphone à l\'avance',
                'Ayez un verre d\'eau à proximité',
                'Préparez les sujets ou questions que vous souhaitez discuter',
                'Rejoignez 5 minutes à l\'avance pour vous assurer que tout fonctionne bien'
            ],
            'reminder_text': '<strong>⏰ Rappels :</strong> Nous vous enverrons des rappels par e-mail 24 heures et 1 heure avant votre séance. Vous recevrez également des notifications dans l\'application.',
            'button_view': 'Voir Mes Rendez-vous',
            'cancellation_title': 'Besoin de reprogrammer ?',
            'cancellation_text': 'Vous pouvez annuler ou modifier votre rendez-vous jusqu\'à 24 heures à l\'avance depuis votre tableau de bord.',
            'closing': 'Si vous avez des questions ou des préoccupations avant votre séance, n\'hésitez pas à nous contacter.',
            'footer_help': 'Questions ? Nous sommes là pour vous aider : <a href="mailto:support@khunjit.com" style="color: #10b981; text-decoration: none; font-weight: 600;">support@khunjit.com</a>',
            'footer_copy': '© 2026 KhunJit - Votre Plateforme de Santé Mentale'
        },
        'id': {
            'lang': 'id',
            'title': 'Janji Temu Dikonfirmasi - KhunJit',
            'header_title': '✅ Janji Temu Dikonfirmasi!',
            'header_subtitle': 'Sesi terapi Anda sudah siap',
            'greeting': 'Hai {{firstName}}, Anda siap! 🎉',
            'intro': 'Janji temu Anda dengan <strong style="color: #111827;">{{psychologistName}}</strong> telah dikonfirmasi. Kami menantikan untuk mendukung Anda dalam perjalanan kesehatan mental Anda.',
            'psychologist_label': '👨‍⚕️ Psikolog Anda',
            'date_label': '📅 Tanggal',
            'time_label': '🕐 Waktu',
            'tips_title': '💡 Tips untuk sesi Anda',
            'tips': [
                'Temukan ruang yang tenang dan pribadi di mana Anda merasa nyaman',
                'Uji kamera dan mikrofon Anda sebelumnya',
                'Siapkan segelas air',
                'Siapkan topik atau pertanyaan yang ingin Anda diskusikan',
                'Bergabung 5 menit lebih awal untuk memastikan semuanya berjalan lancar'
            ],
            'reminder_text': '<strong>⏰ Pengingat:</strong> Kami akan mengirimkan pengingat email 24 jam dan 1 jam sebelum sesi Anda. Anda juga akan menerima notifikasi dalam aplikasi.',
            'button_view': 'Lihat Janji Temu Saya',
            'cancellation_title': 'Perlu menjadwalkan ulang?',
            'cancellation_text': 'Anda dapat membatalkan atau mengubah janji temu Anda hingga 24 jam sebelumnya dari dashboard Anda.',
            'closing': 'Jika Anda memiliki pertanyaan atau kekhawatiran sebelum sesi Anda, jangan ragu untuk menghubungi.',
            'footer_help': 'Pertanyaan? Kami siap membantu: <a href="mailto:support@khunjit.com" style="color: #10b981; text-decoration: none; font-weight: 600;">support@khunjit.com</a>',
            'footer_copy': '© 2026 KhunJit - Platform Kesehatan Mental Anda'
        },
        'it': {
            'lang': 'it',
            'title': 'Appuntamento Confermato - KhunJit',
            'header_title': '✅ Appuntamento Confermato!',
            'header_subtitle': 'La tua sessione di terapia è pronta',
            'greeting': 'Ciao {{firstName}}, sei pronto! 🎉',
            'intro': 'Il tuo appuntamento con <strong style="color: #111827;">{{psychologistName}}</strong> è stato confermato. Non vediamo l\'ora di supportarti nel tuo percorso di salute mentale.',
            'psychologist_label': '👨‍⚕️ Il Tuo Psicologo',
            'date_label': '📅 Data',
            'time_label': '🕐 Ora',
            'tips_title': '💡 Consigli per la tua sessione',
            'tips': [
                'Trova uno spazio tranquillo e privato dove ti senti a tuo agio',
                'Testa la tua fotocamera e il microfono in anticipo',
                'Tieni un bicchiere d\'acqua a portata di mano',
                'Prepara gli argomenti o le domande che vorresti discutere',
                'Unisciti 5 minuti prima per assicurarti che tutto funzioni correttamente'
            ],
            'reminder_text': '<strong>⏰ Promemoria:</strong> Ti invieremo promemoria via email 24 ore e 1 ora prima della tua sessione. Riceverai anche notifiche nell\'app.',
            'button_view': 'Visualizza i Miei Appuntamenti',
            'cancellation_title': 'Hai bisogno di riprogrammare?',
            'cancellation_text': 'Puoi cancellare o modificare il tuo appuntamento fino a 24 ore prima dalla tua dashboard.',
            'closing': 'Se hai domande o dubbi prima della tua sessione, non esitare a contattarci.',
            'footer_help': 'Domande? Siamo qui per aiutarti: <a href="mailto:support@khunjit.com" style="color: #10b981; text-decoration: none; font-weight: 600;">support@khunjit.com</a>',
            'footer_copy': '© 2026 KhunJit - La Tua Piattaforma di Salute Mentale'
        },
        'ja': {
            'lang': 'ja',
            'title': '予約が確認されました - KhunJit',
            'header_title': '✅ 予約が確認されました！',
            'header_subtitle': 'セラピーセッションの準備ができました',
            'greeting': 'こんにちは{{firstName}}さん、準備完了です！🎉',
            'intro': '<strong style="color: #111827;">{{psychologistName}}</strong>との予約が確認されました。あなたのメンタルヘルスの旅をサポートできることを楽しみにしています。',
            'psychologist_label': '👨‍⚕️ 担当心理士',
            'date_label': '📅 日付',
            'time_label': '🕐 時間',
            'tips_title': '💡 セッションのヒント',
            'tips': [
                '快適に感じられる静かでプライベートな場所を見つけてください',
                '事前にカメラとマイクをテストしてください',
                '水を用意しておいてください',
                '話し合いたいトピックや質問を準備してください',
                'すべてがスムーズに進むように5分前に参加してください'
            ],
            'reminder_text': '<strong>⏰ リマインダー：</strong>セッションの24時間前と1時間前にメールリマインダーをお送りします。アプリ内通知も受け取ります。',
            'button_view': '予約を表示',
            'cancellation_title': '予定変更が必要ですか？',
            'cancellation_text': 'ダッシュボードから24時間前まで予約をキャンセルまたは変更できます。',
            'closing': 'セッション前にご質問や懸念がある場合は、お気軽にお問い合わせください。',
            'footer_help': 'ご質問がありますか？お気軽にお問い合わせください：<a href="mailto:support@khunjit.com" style="color: #10b981; text-decoration: none; font-weight: 600;">support@khunjit.com</a>',
            'footer_copy': '© 2026 KhunJit - あなたのメンタルヘルスプラットフォーム'
        },
        'ko': {
            'lang': 'ko',
            'title': '예약 확인됨 - KhunJit',
            'header_title': '✅ 예약이 확인되었습니다!',
            'header_subtitle': '치료 세션이 준비되었습니다',
            'greeting': '안녕하세요 {{firstName}}님, 준비 완료! 🎉',
            'intro': '<strong style="color: #111827;">{{psychologistName}}</strong>님과의 예약이 확인되었습니다. 귀하의 정신 건강 여정을 지원하게 되어 기쁩니다.',
            'psychologist_label': '👨‍⚕️ 담당 심리상담사',
            'date_label': '📅 날짜',
            'time_label': '🕐 시간',
            'tips_title': '💡 세션을 위한 팁',
            'tips': [
                '편안하게 느낄 수 있는 조용하고 사적인 공간을 찾으세요',
                '카메라와 마이크를 미리 테스트하세요',
                '물 한 잔을 준비하세요',
                '논의하고 싶은 주제나 질문을 준비하세요',
                '모든 것이 원활하게 작동하도록 5분 일찍 참여하세요'
            ],
            'reminder_text': '<strong>⏰ 알림:</strong> 세션 24시간 전과 1시간 전에 이메일 알림을 보내드립니다. 앱 내 알림도 받으실 수 있습니다.',
            'button_view': '내 예약 보기',
            'cancellation_title': '일정 변경이 필요하신가요?',
            'cancellation_text': '대시보드에서 24시간 전까지 예약을 취소하거나 변경할 수 있습니다.',
            'closing': '세션 전에 질문이나 우려 사항이 있으시면 언제든지 문의해 주세요.',
            'footer_help': '질문이 있으신가요? 도와드리겠습니다: <a href="mailto:support@khunjit.com" style="color: #10b981; text-decoration: none; font-weight: 600;">support@khunjit.com</a>',
            'footer_copy': '© 2026 KhunJit - 당신의 정신 건강 플랫폼'
        },
        'th': {
            'lang': 'th',
            'title': 'ยืนยันการนัดหมายแล้ว - KhunJit',
            'header_title': '✅ ยืนยันการนัดหมายแล้ว!',
            'header_subtitle': 'เซสชันบำบัดของคุณพร้อมแล้ว',
            'greeting': 'สวัสดี {{firstName}} คุณพร้อมแล้ว! 🎉',
            'intro': 'การนัดหมายของคุณกับ <strong style="color: #111827;">{{psychologistName}}</strong> ได้รับการยืนยันแล้ว เรายินดีที่จะสนับสนุนคุณในเส้นทางสุขภาพจิตของคุณ',
            'psychologist_label': '👨‍⚕️ นักจิตวิทยาของคุณ',
            'date_label': '📅 วันที่',
            'time_label': '🕐 เวลา',
            'tips_title': '💡 เคล็ดลับสำหรับเซสชันของคุณ',
            'tips': [
                'หาพื้นที่ที่เงียบสงบและเป็นส่วนตัวที่คุณรู้สึกสบายใจ',
                'ทดสอบกล้องและไมโครโฟนของคุณล่วงหน้า',
                'เตรียมน้ำไว้ข้างๆ',
                'เตรียมหัวข้อหรือคำถามที่คุณต้องการพูดคุย',
                'เข้าร่วมก่อนเวลา 5 นาทีเพื่อให้แน่ใจว่าทุกอย่างทำงานได้อย่างราบรื่น'
            ],
            'reminder_text': '<strong>⏰ การเตือนความจำ:</strong> เราจะส่งอีเมลเตือนความจำให้คุณก่อนเซสชัน 24 ชั่วโมงและ 1 ชั่วโมง คุณจะได้รับการแจ้งเตือนในแอปด้วย',
            'button_view': 'ดูการนัดหมายของฉัน',
            'cancellation_title': 'ต้องการเปลี่ยนกำหนดการหรือไม่?',
            'cancellation_text': 'คุณสามารถยกเลิกหรือแก้ไขการนัดหมายได้ล่วงหน้าถึง 24 ชั่วโมงจากแดชบอร์ดของคุณ',
            'closing': 'หากคุณมีคำถามหรือข้อกังวลใดๆ ก่อนเซสชันของคุณ โปรดอย่าลังเลที่จะติดต่อเรา',
            'footer_help': 'มีคำถามหรือไม่? เรายินดีช่วยเหลือ: <a href="mailto:support@khunjit.com" style="color: #10b981; text-decoration: none; font-weight: 600;">support@khunjit.com</a>',
            'footer_copy': '© 2026 KhunJit - แพลตฟอร์มสุขภาพจิตของคุณ'
        },
        'vi': {
            'lang': 'vi',
            'title': 'Đã Xác Nhận Cuộc Hẹn - KhunJit',
            'header_title': '✅ Đã Xác Nhận Cuộc Hẹn!',
            'header_subtitle': 'Buổi trị liệu của bạn đã sẵn sàng',
            'greeting': 'Xin chào {{firstName}}, bạn đã sẵn sàng! 🎉',
            'intro': 'Cuộc hẹn của bạn với <strong style="color: #111827;">{{psychologistName}}</strong> đã được xác nhận. Chúng tôi mong được hỗ trợ bạn trong hành trình sức khỏe tâm thần.',
            'psychologist_label': '👨‍⚕️ Nhà Tâm Lý Của Bạn',
            'date_label': '📅 Ngày',
            'time_label': '🕐 Giờ',
            'tips_title': '💡 Mẹo cho buổi của bạn',
            'tips': [
                'Tìm một không gian yên tĩnh, riêng tư nơi bạn cảm thấy thoải mái',
                'Kiểm tra camera và micro của bạn trước',
                'Chuẩn bị một ly nước ở gần',
                'Chuẩn bị các chủ đề hoặc câu hỏi bạn muốn thảo luận',
                'Tham gia sớm 5 phút để đảm bảo mọi thứ hoạt động trơn tru'
            ],
            'reminder_text': '<strong>⏰ Lời nhắc:</strong> Chúng tôi sẽ gửi email nhắc nhở cho bạn 24 giờ và 1 giờ trước buổi của bạn. Bạn cũng sẽ nhận được thông báo trong ứng dụng.',
            'button_view': 'Xem Cuộc Hẹn Của Tôi',
            'cancellation_title': 'Cần đặt lại lịch?',
            'cancellation_text': 'Bạn có thể hủy hoặc sửa đổi cuộc hẹn của mình trước 24 giờ từ bảng điều khiển của bạn.',
            'closing': 'Nếu bạn có bất kỳ câu hỏi hoặc thắc mắc nào trước buổi của bạn, xin đừng ngần ngại liên hệ.',
            'footer_help': 'Có câu hỏi? Chúng tôi ở đây để giúp bạn: <a href="mailto:support@khunjit.com" style="color: #10b981; text-decoration: none; font-weight: 600;">support@khunjit.com</a>',
            'footer_copy': '© 2026 KhunJit - Nền Tảng Sức Khỏe Tâm Thần Của Bạn'
        }
    }
}

def load_english_template(template_name):
    """Load English template as base"""
    template_path = Path(f'server/email/templates/en/{template_name}')
    if not template_path.exists():
        print(f"❌ English template not found: {template_path}")
        return None
    with open(template_path, 'r', encoding='utf-8') as f:
        return f.read()

def translate_template(template_content, lang_code, template_name):
    """Translate template content to target language"""
    translations = TRANSLATIONS.get(template_name, {}).get(lang_code, {})

    if not translations:
        print(f"⚠️  No translations found for {template_name} in {lang_code}")
        return None

    # Update lang attribute
    content = re.sub(r'<html lang="en">', f'<html lang="{translations["lang"]}">', template_content)

    # Update title
    content = re.sub(r'<title>.*?</title>', f'<title>{translations["title"]}</title>', content, flags=re.DOTALL)

    # For booking-confirmed-patient, do specific translations
    if template_name == 'booking-confirmed-patient.html':
        # Header
        content = re.sub(
            r'<h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">.*?</h1>',
            f'<h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">{translations["header_title"]}</h1>',
            content,
            count=1
        )
        content = re.sub(
            r'<p style="margin: 10px 0 0; color: rgba\(255, 255, 255, 0\.95\); font-size: 15px;">.*?</p>',
            f'<p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.95); font-size: 15px;">{translations["header_subtitle"]}</p>',
            content,
            count=1
        )

        # Greeting
        content = re.sub(
            r'Hi \{\{firstName\}\}, you\'re all set! 🎉',
            translations["greeting"],
            content
        )

        # Intro paragraph
        content = re.sub(
            r'Your appointment with <strong style="color: #111827;">\{\{psychologistName\}\}</strong> has been confirmed\..*?mental health journey\.',
            translations["intro"],
            content,
            flags=re.DOTALL
        )

        # Labels
        content = re.sub(r'👨‍⚕️ Your Psychologist', translations["psychologist_label"], content)
        content = re.sub(r'📅 Date', translations["date_label"], content)
        content = re.sub(r'🕐 Time', translations["time_label"], content)

        # Tips section
        content = re.sub(r'💡 Tips for your session', translations["tips_title"], content)

        # Tips list items
        tips_section = re.search(r'<ul style="margin: 0; padding: 0 0 0 22px;.*?>(.*?)</ul>', content, re.DOTALL)
        if tips_section and 'tips' in translations:
            new_tips = '\n'.join([f'                  <li>{tip}</li>' for tip in translations['tips']])
            content = re.sub(
                r'(<ul style="margin: 0; padding: 0 0 0 22px;.*?>).*?(</ul>)',
                f'\\1\n{new_tips}\n                \\2',
                content,
                flags=re.DOTALL,
                count=1
            )

        # Reminder text
        content = re.sub(
            r'<strong>⏰ Reminders:</strong>.*?in-app notifications\.',
            translations["reminder_text"],
            content,
            flags=re.DOTALL
        )

        # Button
        content = re.sub(r'>View My Appointments<', f'>{translations["button_view"]}<', content)

        # Cancellation policy
        content = re.sub(r'Need to reschedule\?', translations["cancellation_title"], content)
        content = re.sub(
            r'You can cancel or modify your appointment.*?from your dashboard\.',
            translations["cancellation_text"],
            content
        )

        # Closing paragraph
        content = re.sub(
            r'If you have any questions or concerns before your session.*?hesitate to reach out\.',
            translations["closing"],
            content,
            flags=re.DOTALL
        )

        # Footer
        content = re.sub(
            r'Questions\? We\'re here to help:.*?</a>',
            translations["footer_help"],
            content,
            flags=re.DOTALL
        )
        content = re.sub(
            r'© 2026 KhunJit - Your Mental Health Platform',
            translations["footer_copy"],
            content
        )

    return content

def create_translated_templates():
    """Create all translated templates"""
    base_dir = Path('server/email/templates')

    for template_name in TEMPLATES:
        print(f"\n📝 Processing: {template_name}")

        # Load English template
        english_content = load_english_template(template_name)
        if not english_content:
            continue

        # For each language
        for lang_code, lang_name in LANGUAGES.items():
            print(f"  → Translating to {lang_name} ({lang_code})...", end=' ')

            # Translate content
            translated_content = translate_template(english_content, lang_code, template_name)

            if translated_content:
                # Create directory if not exists
                lang_dir = base_dir / lang_code
                lang_dir.mkdir(parents=True, exist_ok=True)

                # Write translated file
                output_path = lang_dir / template_name
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(translated_content)

                print(f"✅ Created {output_path}")
            else:
                print(f"⚠️  Skipped (no translations)")

def main():
    print("=" * 60)
    print("Email Template Translation Generator")
    print("=" * 60)
    print(f"\nLanguages: {', '.join(LANGUAGES.keys())}")
    print(f"Templates: {', '.join(TEMPLATES)}")
    print(f"Total files to create: {len(LANGUAGES) * len(TEMPLATES)}")
    print("\n" + "=" * 60)

    create_translated_templates()

    print("\n" + "=" * 60)
    print("✨ Template generation complete!")
    print("=" * 60)

if __name__ == '__main__':
    main()
