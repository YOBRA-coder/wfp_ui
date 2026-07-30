// ─── Education ────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { C } from "../utils/constants.jsx";
import { Card, ProgressBar, Stat, Badge, Row, Grid, Btn, FG, Inp, Sel, Modal } from "../shared/Shared.jsx";

export default function Education({ api }) {
  const [courses,  setCourses]  = useState([]);
  const [myProg,   setMyProg]   = useState([]);
  const [active,   setActive]   = useState(null); // { course, lessons, lessonIdx }
  const [quiz,     setQuiz]     = useState(null);  // { answered, chosen, correct }

  const loadAll = useCallback(() => {
    api.get("/education/courses").then(d => setCourses(d.courses || [])).catch(() => {});
    api.get("/education/my-progress").then(d => setMyProg(d.progress || [])).catch(() => {});
  }, [api]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const openCourse = async c => {
    try {
      const d = await api.get(`/education/courses/${c.id}`);
      const idx = d.progress?.lesson_idx || 0;
      setActive({ course: d, lessons: d.lessons || [], idx });
      setQuiz(null);
    } catch (e) { alert(e.message); }
  };

  const saveProgress = (courseId, idx, completed = false) => {
    api.post("/education/progress", { course_id: courseId, lesson_idx: idx, completed, score: completed ? 80 : 0 }).catch(() => {});
  };

  const next = () => {
    const { course, lessons, idx } = active;
    if (lessons[idx]?.quiz && !quiz?.answered) { alert("Please answer the quiz first!"); return; }
    if (idx < lessons.length - 1) {
      const nxt = idx + 1;
      setActive(p => ({ ...p, idx: nxt }));
      setQuiz(null);
      saveProgress(course.id, nxt);
    } else {
      saveProgress(course.id, lessons.length, true);
      alert(`🎉 Course complete! "${course.title}"`);
      setActive(null);
      loadAll();
    }
  };

  const progMap = Object.fromEntries(myProg.map(p => [p.course_id, p]));
  const ICONS   = { basics: "📊", technical: "📈", risk: "🛡️", psychology: "🧠", advanced: "⚡" };
  const LVCOL   = { beginner: C.green, intermediate: C.blue, advanced: C.gold };

  // Lesson view
  if (active) {
    const { course, lessons, idx } = active;
    const lesson = lessons[idx];
    const pct    = Math.floor((idx / lessons.length) * 100);
    return (
      <div style={{ padding: 20 }}>
        <Btn col={C.muted} ghost onClick={() => setActive(null)} style={{ marginBottom: 14 }}>← Back to Courses</Btn>
        <div style={{ maxWidth: 760 }}>
          <div style={{ fontSize: 10, color: LVCOL[course.level] || C.muted, letterSpacing: 2, marginBottom: 5 }}>
            {course.title.toUpperCase()} — LESSON {idx + 1}/{lessons.length}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>{lesson.title}</div>
          <ProgressBar pct={pct} />
          <div style={{ background: C.surf2, border: `1px solid ${C.border}`, borderRadius: 9, padding: 20, fontSize: 14, lineHeight: 1.9, color: C.text, opacity: 0.88, marginBottom: 16 }}>
            {lesson.content}
          </div>

          {lesson.quiz && (
            <div style={{ background: C.surf2, border: `1px solid ${C.border}`, borderRadius: 9, padding: 18 }}>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>📝 Quick Quiz</div>
              <div style={{ fontSize: 14, marginBottom: 12 }}>{lesson.quiz.q}</div>
              {lesson.quiz.options.map((opt, i) => {
                const state = !quiz?.answered ? "idle" : i === quiz.correct ? "correct" : i === quiz.chosen && i !== quiz.correct ? "wrong" : "idle";
                const col   = state === "correct" ? C.green : state === "wrong" ? C.red : C.border;
                const bg    = state === "correct" ? C.green + "18" : state === "wrong" ? C.red + "18" : C.surf;
                return (
                  <div key={i} onClick={() => !quiz?.answered && setQuiz({ answered: true, chosen: i, correct: lesson.quiz.answer })}
                    style={{ background: bg, border: `1px solid ${col}`, color: state !== "idle" ? col : C.text, borderRadius: 8, padding: "9px 13px", cursor: "pointer", marginBottom: 7, fontSize: 13, transition: "all .2s" }}>
                    {String.fromCharCode(65 + i)}. {opt}
                  </div>
                );
              })}
              {quiz?.answered && (
                <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: quiz.chosen === quiz.correct ? C.green : C.red }}>
                  {quiz.chosen === quiz.correct ? "✓ Correct!" : "✗ Wrong — re-read the lesson above"}
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            {idx > 0 && <Btn col={C.muted} ghost onClick={() => { setActive(p => ({ ...p, idx: idx - 1 })); setQuiz(null); }}>← Previous</Btn>}
            <Btn col={C.gold} onClick={next} style={{ marginLeft: "auto" }}>{idx < lessons.length - 1 ? "Next Lesson →" : "Complete Course ✓"}</Btn>
          </div>
        </div>
      </div>
    );
  }

  const done   = myProg.filter(p => p.completed).length;
  const inProg = myProg.filter(p => p.lesson_idx > 0 && !p.completed).length;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 3 }}>Learning Hub</div>
          <div style={{ fontSize: 12, color: C.muted }}>Master forex from fundamentals to advanced copy trading systems</div>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {[["Completed", done, C.green], ["In Progress", inProg, C.gold], ["Total", courses.length, C.text]].map(([l, v, c]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: c }}>{v}</div>
              <div style={{ fontSize: 10, color: C.muted }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 16 }}>
        {courses.map(c => {
          const prog = progMap[c.id] || { lesson_idx: 0, completed: 0 };
          const pct  = prog.completed ? 100 : Math.floor((prog.lesson_idx / (c.lesson_count || 1)) * 100);
          return (
            <div key={c.id} onClick={() => openCourse(c)} style={{
              background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, cursor: "pointer",
            }}
              onMouseOver={e => e.currentTarget.style.borderColor = C.muted}
              onMouseOut={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ fontSize: 30, marginBottom: 10 }}>{ICONS[c.category] || "📚"}</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{c.title}</div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, lineHeight: 1.55 }}>{c.description}</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 11, flexWrap: "wrap" }}>
                <Badge col={LVCOL[c.level] || C.muted}>{c.level}</Badge>
                <Badge col={C.muted}>{c.lesson_count} lessons</Badge>
                {prog.completed ? <Badge col={C.green}>✓ Done</Badge> : null}
              </div>
              <ProgressBar pct={pct} />
              <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{pct}% complete</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}