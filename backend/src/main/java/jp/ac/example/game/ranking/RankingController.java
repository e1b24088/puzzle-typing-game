package jp.ac.example.game.ranking;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rankings")
public class RankingController {
    private final RankingStore store;
    public RankingController(RankingStore store) { this.store = store; }
    @PostMapping
    public RankingStore.Entry submit(@RequestBody RankingStore.Submission submission) { return store.submit(submission); }
    @GetMapping
    public RankingStore.Board board(@RequestParam String mode, @RequestParam(required=false) String selfId) { return store.board(mode, selfId); }
}
