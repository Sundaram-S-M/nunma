export interface BlogPost {
  id: number;
  slug: string;
  image: string;
  date: string;
  title: string;
  excerpt: string;
  readTime: string;
  author: string;
  content: string[];
}

export const blogPosts: BlogPost[] = [
  {
    id: 1,
    slug: 'digitizing-attendance-tuition-centres',
    image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&q=80&w=800',
    date: 'Mar 20, 2026',
    readTime: '5 min read',
    author: 'Nunma Team',
    title: 'From Register Books to Real-Time Dashboards: Digitizing Attendance for Tuition Centres',
    excerpt: 'Traditional paper attendance registers are slow, error-prone, and hide patterns. Discover how digital check-ins keep parents updated and save tutor hours.',
    content: [
      'For decades, tuition centres and private coaching classes have relied on the classic paper register book. Tutors spend the first ten minutes of every batch calling out names, marking "P" or "A" with red pens, and manually calculation monthly attendance percentages. While this process is familiar, it hides deep inefficiencies and missed opportunities.',
      'First, paper books are highly error-prone. A missed entry, a misplaced folder, or ink smudges can make it impossible to track student regularity over a term. Second, and most importantly, physical registers fail to answer a critical question that parents ask every single day: "Did my child arrive safely at the tuition centre?"',
      'In a modern educational ecosystem, safety and transparency are paramount. If a student skips a class, parents often remain in the dark until report cards are issued or a tutor makes a phone call days later. By then, valuable intervention time is lost.',
      'Digitizing attendance with Nunma changes the entire dynamic. Tutors can check students in with a single tap on a clean dashboard interface. Instantly, an automated notification is dispatched to parents confirming their child\'s safe arrival. This simple flow builds tremendous trust between the tuition centre and parents.',
      'Moreover, real-time dashboards compile this data automatically. Tutors can instantly identify chronic absenteeism patterns, visualize batch-wise attendance charts, and target support to students who are falling behind. Moving from register books to digital dashboards isn\'t just about replacing paper—it\'s about upgrading the connection between educators, students, and parents.'
    ]
  },
  {
    id: 2,
    slug: 'running-batches-without-whatsapp-groups',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800',
    date: 'Mar 17, 2026',
    readTime: '6 min read',
    author: 'Vijay Kumar',
    title: 'How to Run 10th, +1, and +2 Batches Without Juggling Five WhatsApp Groups',
    excerpt: 'Managing syllabus materials, schedules, homework files, and parent calls across multiple WhatsApp groups is chaotic. Here is a better structure.',
    content: [
      'Any tuition teacher running standard state board or CBSE batches knows the administrative nightmare of WhatsApp. You start with one general group, which quickly duplicates into a "10th Standard Group," a "Plus One Maths Group," a "Plus Two Physics Group," a "Parents Only Group," and so on. Before you know it, your phone is buzzing 24/7 with questions.',
      'Important homework files get buried under a heap of morning wishes and parent queries. Students miss assignment deadlines because the PDF link was shared three days ago and got lost in a sea of chat messages. When a student joins a batch late, you have to re-send all past materials individually because WhatsApp doesn\'t support viewing chat history before entry.',
      'Furthermore, boundaries disappear. Tutors receive calls at midnight asking about test schedules, and personal phone numbers are exposed to everyone. It is chaotic, unprofessional, and exhausting.',
      'The solution lies in dedicated Classroom Zones. Instead of chaotic chat logs, tuition centres need a structured layout where each batch has its own workspace. Announcements, study materials, live class links, and student assignments should live in dedicated folders rather than a scrolling timeline.',
      'On Nunma, batches are organized into clean "Zones." When a student enters, they see their schedule, past recordings, resources, and tests categorized by topic. Past materials are instantly accessible to new joiners, chats are kept professional, and tutors reclaim their peace of mind.'
    ]
  },
  {
    id: 3,
    slug: 'online-backup-classroom-tamil-nadu',
    image: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&q=80&w=800',
    date: 'Mar 14, 2026',
    readTime: '4 min read',
    author: 'Ramesh Sundar',
    title: 'Why Every Tuition Centre in Tamil Nadu Needs an Online Backup Classroom',
    excerpt: 'Monsoon rain holidays, transport strikes, or unexpected power cuts shouldn\'t stop exam preparation. A digital backup guarantees learning continuity.',
    content: [
      'In Tamil Nadu, physical classes face regular disruptions. From heavy Northeast monsoon rains triggering school and college holiday declarations to local transport strikes or unexpected grid maintenance, tuition centres often have to cancel scheduled sessions. For critical board exam batches (10th, +1, and +2), every lost day adds pressure to finish the syllabus.',
      'Attempting to reschedule missed classes on weekends leads to scheduling conflicts, tired students, and rushed learning. Moreover, students who fall sick or travel miss out entirely on crucial topics, making it harder for them to catch up during board exam preparation.',
      'An online backup classroom acts as an insurance policy for your tuition centre. By having a virtual space ready, a sudden rainy day doesn\'t mean a cancelled class. Tutors can instantly schedule a live stream or share pre-recorded lectures, keeping the study momentum going without missing a single beat.',
      'Additionally, recording physical classes and storing them in an online zone ensures that students who miss a class due to illness have an immediate resource to review. It also serves as a revision library where students can re-watch complex physics or math explanations before their finals.',
      'Building an online backup classroom is no longer a luxury; it is a necessity to ensure zero compromises on student preparation.'
    ]
  },
  {
    id: 4,
    slug: 'cost-of-manual-exam-grading-ai-assist',
    image: 'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?auto=format&fit=crop&q=80&w=800',
    date: 'Mar 11, 2026',
    readTime: '7 min read',
    author: 'AI Insights',
    title: 'The Hidden Cost of Manual Exam Grading — And How AI Assist Can Cut It in Half',
    excerpt: 'Tutors spend up to 10 hours a week marking test sheets, leaving less energy for actual teaching. See how automated scoring and AI feedback help.',
    content: [
      'Testing is the backbone of any successful tuition centre. Regular weekly exams help evaluate student understanding and prepare them for board exam formats. However, the process of grading these tests has a massive hidden cost: tutor exhaustion.',
      'If you have 150 students writing a 50-mark test every week, grading takes hours of painstaking work. Tutors spend late nights checking calculation steps, marking spelling errors, and filling out report cards. This administrative load takes time away from lesson planning, creating quality study materials, or offering one-on-one attention to struggling students.',
      'Worse, delayed grading impacts learning. If a student receives their corrected answer sheet a week after the test, the context of their mistakes is lost. Feedback is most effective when it is immediate.',
      'With AI Assist tools, this grading cycle can be cut in half. Multiple-choice questions are scored instantly upon submission, giving students immediate feedback. For descriptive answers, AI models can highlight specific calculation errors or missing keywords, providing draft feedback that tutors can quickly verify and approve.',
      'By digitizing tests and using AI-supported grading, tuition centres can return report cards within hours instead of days. Tutors save energy, students learn from their mistakes immediately, and parent reports are dispatched automatically. It is a win-win for everyone involved.'
    ]
  },
  {
    id: 5,
    slug: 'building-tuition-centre-brand-online',
    image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=800',
    date: 'Mar 8, 2026',
    readTime: '5 min read',
    author: 'Branding Desk',
    title: 'Turning One-Time Students Into a Community: Building a Tuition Centre Brand Online',
    excerpt: 'Tuition centres shouldn\'t rely solely on pamphlet distribution or local word-of-mouth. Build a permanent digital brand with public portfolios.',
    content: [
      'Traditionally, tuition centres have grown through highly localized methods: newspaper flyers, banner placements near schools, or word-of-mouth recommendations from parents in the neighborhood. While this is useful, it limits your growth to a narrow geographic circle.',
      'In the digital era, students and parents look for credibility online before enrolling. A basic tuition centre can be transformed into an educational brand by creating a community presence. This starts by showcasing your track record of student success.',
      'Instead of paper pamphlets, modern tuition brands share digital "Proof-of-Work" pages. These pages highlight top scorers, display student projects, and show verified learning accomplishments. It acts as an evergreen digital showcase that anyone can access, search, and share.',
      'Furthermore, building an online alumni community helps keep past students connected. When senior students share their board exam success, college placements, and career updates, it inspires the junior batches and builds long-term institutional prestige.',
      'By taking your tuition centre brand online, you establish authority, build a community of achievers, and attract high-quality students year-round.'
    ]
  }
];
