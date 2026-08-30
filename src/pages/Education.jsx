// ─── Education / Learning Hub ───────────────────────────────────────────────
import { useState, useEffect, useCallback, useMemo } from "react";
import { C } from "../utils/constants.jsx";
import { Card, ProgressBar, Stat, Badge, Row, Grid, Btn, FG, Inp, Sel, Modal } from "../shared/Shared.jsx";

const ICONS = { basics: "📊", technical: "📈", risk: "🛡️", psychology: "🧠", advanced: "⚡" };
const LVCOL = { beginner: C.green, intermediate: C.blue, advanced: C.gold };
const CATEGORY_LABELS = { basics: "Basics", technical: "Technical", risk: "Risk", psychology: "Psychology", advanced: "Advanced" };

export default function Education({ api }) {
  const [courses,  setCourses]  = useState([]);
  const [myProg,   setMyProg]   = useState([]);
  const [active,   setActive]   = useState(null); // { course, lessons, idx }
  // quiz answers for the CURRENT lesson — { [questionIndex]: chosenOptionIndex }
  const [quizAnswers, setQuizAnswers] = useState({});
  const [levelFilter, setLevelFilter] = useState("all"); // all | beginner | intermediate | advanced
  const [catFilter,   setCatFilter]   = useState("all"); // all | basics | technical | risk | psychology | advanced
  const [search,       setSearch]     = useState("");

  const loadAll = useCallback(() => {
    api.get("/education/courses").then(d => setCourses(d.courses || [])).catch(() => {});
    api.get("/education/my-progress").then(d => setMyProg(d.progress || [])).catch(() => {});
  }, [api]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const openCourse = async (c) => {
    try {
      const d = await api.get(`/education/courses/${c.id}`);
      const idx = d.progress?.lesson_idx || 0;
      setActive({ course: d, lessons: d.lessons || [], idx: Math.min(idx, (d.lessons?.length || 1) - 1) });
      setQuizAnswers({});
    } catch (e) { alert(e.message); }
  };

  const saveProgress = (courseId, idx, completed = false, score = 0) => {
    api.post("/education/progress", { course_id: courseId, lesson_idx: idx, completed, score }).catch(() => {});
  };

  // ── Quiz grading for the active lesson ──
  const lessonQuiz = active?.lessons?.[active.idx]?.quiz || [];
  const allAnswered = lessonQuiz.length > 0 && lessonQuiz.every((_, i) => quizAnswers[i] != null);
  const correctCount = lessonQuiz.reduce((n, q, i) => n + (quizAnswers[i] === q.answer ? 1 : 0), 0);
  const lessonScorePct = lessonQuiz.length ? Math.round((correctCount / lessonQuiz.length) * 100) : 100;

  const goNext = () => {
    const { course, lessons, idx } = active;
    if (lessonQuiz.length && !allAnswered) { alert(`Please answer all ${lessonQuiz.length} question${lessonQuiz.length > 1 ? "s" : ""} first!`); return; }
    if (idx < lessons.length - 1) {
      const nxt = idx + 1;
      setActive((p) => ({ ...p, idx: nxt }));
      setQuizAnswers({});
      saveProgress(course.id, nxt, false, lessonScorePct);
    } else {
      saveProgress(course.id, lessons.length, true, lessonScorePct);
      alert(`🎉 Course complete! "${course.title}" — final lesson score ${lessonScorePct}%`);
      setActive(null);
      loadAll();
    }
  };

  const goPrev = () => {
    setActive((p) => ({ ...p, idx: p.idx - 1 }));
    setQuizAnswers({});
  };

  const progMap = Object.fromEntries(myProg.map((p) => [p.course_id, p]));

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      if (levelFilter !== "all" && c.level !== levelFilter) return false;
      if (catFilter !== "all" && c.category !== catFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!c.title.toLowerCase().includes(q) && !(c.description || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [courses, levelFilter, catFilter, search]);

  // ═══ Lesson viewer ═══
  if (active) {
    const { course, lessons, idx } = active;
    const lesson = lessons[idx];
    const pct    = Math.round((idx / lessons.length) * 100);
    const isLast = idx === lessons.length - 1;
    return (
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <Btn col={C.muted} ghost onClick={() => setActive(null)}>← Back to Courses</Btn>
          <div style={{ fontSize: 11, color: C.muted }}>{idx + 1} / {lessons.length} lessons · ~{lesson.duration || 5} min</div>
        </div>
        <div style={{ maxWidth: 820 }}>
          <div style={{ fontSize: 10, color: LVCOL[course.level] || C.muted, letterSpacing: 2, marginBottom: 5, fontWeight: 700 }}>
            {course.title.toUpperCase()} — LESSON {idx + 1}/{lessons.length}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{lesson.title}</div>
          {lesson.summary && <div style={{ fontSize: 13, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>{lesson.summary}</div>}
          <ProgressBar pct={pct} />

          {/* Lesson content, broken into real sub-topic sections instead of one wall of text */}
          {Array.isArray(lesson.sections) ? (
            <div style={{ marginTop: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {lesson.sections.map((s, i) => (
                <div key={i} style={{ background: C.surf2, border: `1px solid ${C.border}`, borderRadius: 9, padding: "16px 20px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, marginBottom: 7 }}>{s.heading}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.85, color: C.text, opacity: 0.9 }}>{s.body}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: C.surf2, border: `1px solid ${C.border}`, borderRadius: 9, padding: 20, fontSize: 14, lineHeight: 1.9, color: C.text, opacity: 0.88, marginTop: 16, marginBottom: 16 }}>
              {lesson.content}
            </div>
          )}

          {/* Key Takeaways / notes — the cheat-sheet a trader would actually re-read later */}
          {Array.isArray(lesson.notes) && lesson.notes.length > 0 && (
            <div style={{ background: `${C.gold}0f`, border: `1px solid ${C.gold}44`, borderRadius: 9, padding: "16px 20px", marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginBottom: 9, display: "flex", alignItems: "center", gap: 6 }}>
                📌 Key Takeaways
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
                {lesson.notes.map((n, i) => (
                  <li key={i} style={{ fontSize: 13, color: C.text, opacity: 0.92, lineHeight: 1.6 }}>{n}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Quiz — multiple questions per lesson, each graded and explained individually */}
          {lessonQuiz.length > 0 && (
            <div style={{ background: C.surf2, border: `1px solid ${C.border}`, borderRadius: 9, padding: 18, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontWeight: 700 }}>📝 Check Your Understanding</div>
                <div style={{ fontSize: 11, color: C.muted }}>{lessonQuiz.length} question{lessonQuiz.length > 1 ? "s" : ""}</div>
              </div>
              {lessonQuiz.map((qz, qi) => {
                const chosen = quizAnswers[qi];
                const answered = chosen != null;
                return (
                  <div key={qi} style={{ marginBottom: qi < lessonQuiz.length - 1 ? 20 : 4 }}>
                    <div style={{ fontSize: 13, marginBottom: 10, fontWeight: 600 }}>{qi + 1}. {qz.q}</div>
                    {qz.options.map((opt, i) => {
                      const state = !answered ? "idle" : i === qz.answer ? "correct" : i === chosen && i !== qz.answer ? "wrong" : "idle";
                      const col = state === "correct" ? C.green : state === "wrong" ? C.red : C.border;
                      const bg  = state === "correct" ? C.green + "18" : state === "wrong" ? C.red + "18" : C.surf;
                      return (
                        <div
                          key={i}
                          onClick={() => !answered && setQuizAnswers((a) => ({ ...a, [qi]: i }))}
                          style={{ background: bg, border: `1px solid ${col}`, color: state !== "idle" ? col : C.text, borderRadius: 8, padding: "9px 13px", cursor: answered ? "default" : "pointer", marginBottom: 6, fontSize: 13, transition: "all .2s" }}
                        >
                          {String.fromCharCode(65 + i)}. {opt}
                        </div>
                      );
                    })}
                    {answered && (
                      <div style={{
                        marginTop: 6, fontSize: 12, borderRadius: 7, padding: "8px 11px",
                        background: chosen === qz.answer ? `${C.green}14` : `${C.red}14`,
                        border: `1px solid ${chosen === qz.answer ? C.green : C.red}44`,
                      }}>
                        <span style={{ fontWeight: 700, color: chosen === qz.answer ? C.green : C.red }}>
                          {chosen === qz.answer ? "✓ Correct — " : "✗ Not quite — "}
                        </span>
                        <span style={{ color: C.text, opacity: 0.85 }}>{qz.explanation}</span>
                      </div>
                    )}
                  </div>
                );
              })}
              {allAnswered && (
                <div style={{ marginTop: 14, fontSize: 12, fontWeight: 700, color: lessonScorePct >= 70 ? C.green : C.gold }}>
                  Lesson score: {correctCount}/{lessonQuiz.length} correct ({lessonScorePct}%)
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            {idx > 0 && <Btn col={C.muted} ghost onClick={goPrev}>← Previous</Btn>}
            <Btn col={C.gold} onClick={goNext} style={{ marginLeft: "auto" }}>
              {isLast ? "Complete Course ✓" : "Next Lesson →"}
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  // ═══ Course grid / hub ═══
  const done   = myProg.filter((p) => p.completed).length;
  const inProg = myProg.filter((p) => p.lesson_idx > 0 && !p.completed).length;
  const totalLessons = courses.reduce((n, c) => n + (c.lesson_count || 0), 0);
  const categories = Array.from(new Set(courses.map((c) => c.category))).filter(Boolean);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 3 }}>Learning Hub</div>
          <div style={{ fontSize: 12, color: C.muted }}>Master forex from fundamentals to advanced price action, macro, and automated copy trading systems</div>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {[["Completed", done, C.green], ["In Progress", inProg, C.gold], ["Courses", courses.length, C.text], ["Lessons", totalLessons, C.blue]].map(([l, v, c]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: c }}>{v}</div>
              <div style={{ fontSize: 10, color: C.muted }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Search + filters — a real learning hub lets you find the right course fast */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18, alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search courses…"
          style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: C.text, minWidth: 200, flex: "1 1 200px" }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["all", "beginner", "intermediate", "advanced"].map((lv) => (
            <button
              key={lv}
              onClick={() => setLevelFilter(lv)}
              style={{
                fontSize: 11, fontWeight: 700, padding: "6px 11px", borderRadius: 6, cursor: "pointer", textTransform: "capitalize",
                border: `1px solid ${levelFilter === lv ? (LVCOL[lv] || C.gold) : C.border}`,
                background: levelFilter === lv ? `${LVCOL[lv] || C.gold}22` : "transparent",
                color: levelFilter === lv ? (LVCOL[lv] || C.gold) : C.muted,
              }}
            >
              {lv}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["all", ...categories].map((cat) => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              style={{
                fontSize: 11, fontWeight: 700, padding: "6px 11px", borderRadius: 6, cursor: "pointer",
                border: `1px solid ${catFilter === cat ? C.blue : C.border}`,
                background: catFilter === cat ? `${C.blue}22` : "transparent",
                color: catFilter === cat ? C.blue : C.muted,
              }}
            >
              {cat === "all" ? "All Topics" : `${ICONS[cat] || "📚"} ${CATEGORY_LABELS[cat] || cat}`}
            </button>
          ))}
        </div>
      </div>

      {filteredCourses.length === 0 && (
        <div style={{ fontSize: 12, color: C.muted, padding: "30px 0", textAlign: "center" }}>No courses match your filters.</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
        {filteredCourses.map((c) => {
          const prog = progMap[c.id] || { lesson_idx: 0, completed: 0 };
          const pct  = prog.completed ? 100 : Math.floor((prog.lesson_idx / (c.lesson_count || 1)) * 100);
          const totalMin = (c.total_duration != null) ? c.total_duration : null;
          return (
            <div key={c.id} onClick={() => openCourse(c)} style={{
              background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, cursor: "pointer",
            }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = C.muted}
              onMouseOut={(e) => e.currentTarget.style.borderColor = C.border}>
              <div style={{ fontSize: 30, marginBottom: 10 }}>{ICONS[c.category] || "📚"}</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{c.title}</div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, lineHeight: 1.55 }}>{c.description}</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 11, flexWrap: "wrap" }}>
                <Badge col={LVCOL[c.level] || C.muted}>{c.level}</Badge>
                <Badge col={C.muted}>{c.lesson_count} lessons</Badge>
                {totalMin != null && <Badge col={C.muted}>~{totalMin} min</Badge>}
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
