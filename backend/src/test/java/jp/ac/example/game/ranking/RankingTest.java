package jp.ac.example.game.ranking;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:rankingtest;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc
class RankingTest {
    @Autowired RankingStore store;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @BeforeEach void reset() { jdbc.update("DELETE FROM ranking_entries"); }
    RankingStore.Submission entry(String mode, int n) {
        return new RankingStore.Submission(UUID.randomUUID().toString(), mode, "生徒", n, mode.equals("typing") ? null : n, mode.equals("course") ? null : mode.equals("typing") ? n : 0);
    }
    @Test void tiesHaveCompetitionRanksAndStableOrder() {
        var a = store.submit(entry("course", 100));
        var b = store.submit(entry("course", 90));
        var c = store.submit(entry("course", 90));
        store.submit(entry("course", 80));
        var rows = store.board("course", c.id()).top();
        assertEquals(List.of(1L, 2L, 2L, 4L), rows.stream().map(RankingStore.Row::rank).toList());
        assertEquals(List.of(a.id(), b.id(), c.id()), rows.stream().limit(3).map(RankingStore.Row::id).toList());
    }
    @Test void onlyTenRowsButOwnOutsideRowIsReturnedAndModesAreIsolated() {
        for (int n = 12; n > 0; n--) store.submit(entry("course", n));
        var last = store.submit(entry("course", 0));
        var board = store.board("course", last.id());
        assertEquals(10, board.top().size()); assertEquals(13, board.total());
        assertEquals(13, board.self().rank()); assertEquals(13, board.self().position());
        assertNull(store.board("typing", last.id()).self()); assertEquals(0, store.board("typing", null).total());
    }
    @Test void tiedSelfOutsideTenStillHasRankOne() {
        for (int n = 0; n < 10; n++) store.submit(entry("course", 100));
        var self = store.submit(entry("course", 100));
        assertEquals(1, store.board("course", self.id()).self().rank());
        assertEquals(11, store.board("course", self.id()).self().position());
    }
    @Test void retriesOnlyUpdateNameNotScoreAndConcurrentRetriesDoNotDuplicate() throws Exception {
        var source = entry("course", 50);
        var first = store.submit(source);
        var changed = new RankingStore.Submission(source.playId(), "course", "変更後", 50, 50, null);
        try (var pool = new AutoClosePool()) {
            var jobs = new ArrayList<Callable<String>>();
            for (int i = 0; i < 12; i++) jobs.add(() -> store.submit(changed).id());
            for (var future : pool.value.invokeAll(jobs)) assertEquals(first.id(), future.get());
        }
        assertEquals(1, store.board("course", first.id()).total());
        assertEquals("変更後", store.board("course", first.id()).self().name());
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> store.submit(new RankingStore.Submission(source.playId(), "course", "変更後", 60, 60, null)));
    }
    static class AutoClosePool implements AutoCloseable { ExecutorService value = Executors.newFixedThreadPool(4); public void close() { value.shutdownNow(); } }
    @Test void sequentialSumIsValidatedAndRestEndpointsRejectInvalidData() throws Exception {
        var valid = new RankingStore.Submission(UUID.randomUUID().toString(), "sequential", "テスト", 150, 40, 110);
        mvc.perform(post("/api/rankings").contentType("application/json").content(json.writeValueAsString(valid))).andExpect(status().isOk()).andExpect(jsonPath("$.score").value(150));
        mvc.perform(get("/api/rankings").param("mode", "sequential")).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1));
        var invalid = new RankingStore.Submission(UUID.randomUUID().toString(), "sequential", "テスト", 151, 40, 110);
        mvc.perform(post("/api/rankings").contentType("application/json").content(json.writeValueAsString(invalid))).andExpect(status().isBadRequest());
        mvc.perform(get("/api/rankings").param("mode", "unknown")).andExpect(status().isBadRequest());
        for (String name : List.of(" ", "あいうえおかきくけこさしす", "a\nb")) {
            var bad = new RankingStore.Submission(UUID.randomUUID().toString(), "course", name, 1, 1, null);
            mvc.perform(post("/api/rankings").contentType("application/json").content(json.writeValueAsString(bad))).andExpect(status().isBadRequest());
        }
        String fractional = json.writeValueAsString(entry("course", 5)).replace("\"score\":5", "\"score\":5.5");
        mvc.perform(post("/api/rankings").contentType("application/json").content(fractional)).andExpect(status().isBadRequest());
    }
    @Test void fileDatabaseRetainsEntriesAfterReopening() throws Exception {
        var directory = Files.createTempDirectory("ranking-persistence-");
        String url = "jdbc:h2:file:" + directory.resolve("results") + ";DB_CLOSE_ON_EXIT=FALSE";
        var first = new RankingStore(new JdbcTemplate(new DriverManagerDataSource(url, "sa", "")));
        var record = first.submit(entry("course", 88));
        var reopened = new RankingStore(new JdbcTemplate(new DriverManagerDataSource(url, "sa", "")));
        assertEquals(88, reopened.board("course", record.id()).self().score());
        try (var files = Files.walk(directory)) { for (var path : files.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path); }
    }
}
