type Lang = 'uz' | 'en';

class CommentatorEngine {
  private muted = false;
  private volume = 0.9;
  private lang: Lang = 'uz';
  private lastSpokenAt = 0;

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public setLanguage(lang: Lang) {
    this.lang = lang;
  }

  public speak(textUz: string, textEn: string, priority: 'low' | 'normal' | 'high' = 'normal') {
    if (this.muted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const now = Date.now();
    if (priority === 'low' && now - this.lastSpokenAt < 3800) return;
    if (priority === 'normal' && now - this.lastSpokenAt < 1800) return;

    this.lastSpokenAt = now;
    try {
      if (priority === 'high') {
        window.speechSynthesis.cancel();
      } else if (window.speechSynthesis.speaking) {
        return;
      }

      const utter = new SpeechSynthesisUtterance(this.lang === 'uz' ? textUz : textEn);
      utter.volume = this.volume;
      utter.rate = priority === 'high' ? 1.12 : 1.04;
      utter.pitch = priority === 'high' ? 1.1 : 1.0;

      const voices = window.speechSynthesis.getVoices();
      const targetPrefix = this.lang === 'uz' ? 'uz' : 'en';
      const preferred =
        voices.find(v => v.lang.toLowerCase().startsWith(targetPrefix)) ||
        (this.lang === 'uz' ? voices.find(v => v.lang.toLowerCase().startsWith('tr')) : undefined) ||
        voices.find(v => v.lang.toLowerCase().startsWith('en'));
      if (preferred) utter.voice = preferred;

      window.speechSynthesis.speak(utter);
    } catch {}
  }

  public commentKickoff(homeName: string, awayName: string) {
    this.speak(
      `Assalomu alaykum! ${homeName} va ${awayName} uchrashuvi boshlandi!`,
      `Welcome everyone! Kickoff between ${homeName} and ${awayName}!`,
      'high'
    );
  }

  public commentPass(playerName: string) {
    this.speak(`${playerName} aniq pas uzatdi.`, `${playerName} delivers a crisp pass.`, 'low');
  }

  public commentShot(playerName: string) {
    this.speak(`${playerName} kuchli zarba yo'lladi!`, `Powerful strike by ${playerName}!`, 'normal');
  }

  public commentSave(keeperName: string) {
    this.speak(`Ajoyib seyv! Darvozabon ${keeperName} to'pni qaytardi!`, `Brilliant save by ${keeperName}!`, 'high');
  }

  public commentGoal(scorerName: string, teamName: string) {
    this.speak(
      `Gooool! ${teamName} hisobni o'zgartirdi! Gol muallifi ${scorerName}!`,
      `Goal! ${scorerName} scores for ${teamName}!`,
      'high'
    );
  }

  public commentSlideTackle(playerName: string) {
    this.speak(`${playerName}dan keskin podkat!`, `Strong sliding tackle from ${playerName}!`, 'normal');
  }

  public commentFoul(playerName: string, card: 'yellow' | 'red' | 'none') {
    if (card === 'red') {
      this.speak(
        `Qizil kartochka! ${playerName} maydondan chetlatildi!`,
        `Red card! ${playerName} is sent off!`,
        'high'
      );
    } else if (card === 'yellow') {
      this.speak(
        `Sariq kartochka! ${playerName} ogohlantirildi.`,
        `Yellow card shown to ${playerName}.`,
        'high'
      );
    } else {
      this.speak(`Qoida buzildi, jarima zarbasi!`, `Foul committed, free kick awarded!`, 'normal');
    }
  }

  public commentPenalty(teamName: string) {
    this.speak(
      `Penalti! ${teamName} foydasiga o'n bir metrlik jarima zarbasi belgilandi!`,
      `Penalty kick awarded to ${teamName}!`,
      'high'
    );
  }

  public commentThrowIn(teamName: string) {
    this.speak(`To'p yon chiziqdan chiqdi, ${teamName} aut tashlaydi.`, `Throw-in for ${teamName}.`, 'normal');
  }

  public commentCorner(teamName: string) {
    this.speak(`Burchak zarbasi! ${teamName} to'pni burchakdan o'yinga kiritadi.`, `Corner kick to ${teamName}!`, 'normal');
  }

  public commentGoalKick(teamName: string) {
    this.speak(`Darvozadan zarba, ${teamName}.`, `Goal kick for ${teamName}.`, 'low');
  }

  public commentExtraTime(half: 1 | 2) {
    this.speak(
      `Hisob teng! Qo'shimcha ${half}-taym boshlandi!`,
      `Scores are level! Extra time half ${half} is underway!`,
      'high'
    );
  }

  public commentPenalties() {
    this.speak(
      `G'olib aniqlanmadi! Navbat besh martalik penaltilar seriyasiga!`,
      `Still tied after extra time! We are heading to a 5-round penalty shootout!`,
      'high'
    );
  }
}

export const commentatorEngine = new CommentatorEngine();
