package jp.ac.example.game.ranking;

import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@Repository
public class RankingStore {
    private final JdbcTemplate jdbc;
    public record Submission(String playId, String mode, String name, Integer score, Integer courseScore, Integer typingScore) {}
    public record Entry(String id, String playId, String mode, String name, int score, Integer courseScore, Integer typingScore, String createdAt) {}
    public record Row(String id, String name, int score, long rank, long position) {}
    public record Board(List<Row> top, Row self, long total) {}
    public RankingStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        jdbc.execute("CREATE TABLE IF NOT EXISTS ranking_entries (id VARCHAR(36) PRIMARY KEY, play_id VARCHAR(36) NOT NULL UNIQUE, mode VARCHAR(16) NOT NULL, name VARCHAR(48) NOT NULL, score INT NOT NULL, course_score INT, typing_score INT, created_at VARCHAR(40) NOT NULL)");
        jdbc.execute("CREATE INDEX IF NOT EXISTS ranking_order ON ranking_entries(mode, score DESC, created_at, id)");
    }
    private static void mode(String mode) {
        if (!Set.of("course", "typing", "sequential").contains(mode == null ? "" : mode)) throw new ResponseStatusException(BAD_REQUEST, "ゲームモードが不正です");
    }
    private static boolean score(Integer n) { return n != null && n >= 0 && n <= 1_000_000; }
    public synchronized Entry submit(Submission s) {
        mode(s.mode());
        try { if (!UUID.fromString(s.playId()).toString().equalsIgnoreCase(s.playId())) throw new IllegalArgumentException(); }
        catch (RuntimeException e) { throw new ResponseStatusException(BAD_REQUEST, "プレイIDが不正です"); }
        String name = s.name() == null ? "" : s.name().strip();
        if (name.isEmpty() || name.codePointCount(0, name.length()) > 12 || name.codePoints().anyMatch(Character::isISOControl)) throw new ResponseStatusException(BAD_REQUEST, "名前は1〜12文字で入力してください");
        if (!score(s.score())) throw new ResponseStatusException(BAD_REQUEST, "得点が不正です");
        boolean valid = switch (s.mode()) {
            case "course" -> Objects.equals(s.score(), s.courseScore()) && s.typingScore() == null;
            case "typing" -> Objects.equals(s.score(), s.typingScore()) && s.courseScore() == null;
            default -> score(s.courseScore()) && score(s.typingScore()) && s.score() == s.courseScore() + s.typingScore();
        };
        if (!valid) throw new ResponseStatusException(BAD_REQUEST, "得点の内訳が一致しません");
        List<Entry> existing = jdbc.query("SELECT * FROM ranking_entries WHERE play_id = ?", (r, i) -> new Entry(r.getString("id"), r.getString("play_id"), r.getString("mode"), r.getString("name"), r.getInt("score"), r.getObject("course_score", Integer.class), r.getObject("typing_score", Integer.class), r.getString("created_at")), s.playId());
        if (!existing.isEmpty()) {
            Entry e = existing.get(0);
            if (!e.mode().equals(s.mode()) || e.score() != s.score() || !Objects.equals(e.courseScore(), s.courseScore()) || !Objects.equals(e.typingScore(), s.typingScore())) throw new ResponseStatusException(CONFLICT, "このプレイは異なる内容で登録済みです");
            jdbc.update("UPDATE ranking_entries SET name = ? WHERE id = ?", name, e.id());
            return new Entry(e.id(), e.playId(), e.mode(), name, e.score(), e.courseScore(), e.typingScore(), e.createdAt());
        }
        Entry e = new Entry(UUID.randomUUID().toString(), s.playId(), s.mode(), name, s.score(), s.courseScore(), s.typingScore(), new java.time.format.DateTimeFormatterBuilder().appendInstant(9).toFormatter().format(Instant.now()));
        jdbc.update("INSERT INTO ranking_entries VALUES (?, ?, ?, ?, ?, ?, ?, ?)", e.id(), e.playId(), e.mode(), e.name(), e.score(), e.courseScore(), e.typingScore(), e.createdAt());
        return e;
    }
    @org.springframework.transaction.annotation.Transactional(readOnly = true, isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Board board(String mode, String selfId) {
        mode(mode);
        String ranked = "SELECT id, name, score, RANK() OVER (ORDER BY score DESC) AS ranking, ROW_NUMBER() OVER (ORDER BY score DESC, created_at ASC, id ASC) AS placement FROM ranking_entries WHERE mode = ?";
        var mapper = (org.springframework.jdbc.core.RowMapper<Row>) (r, i) -> new Row(r.getString("id"), r.getString("name"), r.getInt("score"), r.getLong("ranking"), r.getLong("placement"));
        List<Row> top = jdbc.query("SELECT * FROM (" + ranked + ") WHERE placement <= 10 ORDER BY placement", mapper, mode);
        List<Row> own = selfId == null ? List.of() : jdbc.query("SELECT * FROM (" + ranked + ") WHERE id = ?", mapper, mode, selfId);
        long total = jdbc.queryForObject("SELECT COUNT(*) FROM ranking_entries WHERE mode = ?", Long.class, mode);
        return new Board(top, own.isEmpty() ? null : own.get(0), total);
    }
}
