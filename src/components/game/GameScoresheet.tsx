import type { Game, ScoringEvent } from '@/types'

interface GameScoresheetProps {
  game: Game
  events: ScoringEvent[]
}

// Generate static HTML string for the scoresheet
function generateScoresheetHtml({ game, events }: GameScoresheetProps): string {
  const formattedDate = game.date.toDate().toLocaleDateString('uk-UA')
  const formattedTime = game.startTime 
    ? game.startTime.toDate().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : ''
  const maxRosterRows = 20
  const maxScoringRows = 29
  
  // Game setup
  const homeStartsOffense = game.startingOffenseTeamId === game.homeTeamId
  const awayStartsOffense = game.startingOffenseTeamId === game.awayTeamId
  const homeStartsLeft = game.homeTeamStartsLeft === true
  const homeStartsRight = game.homeTeamStartsLeft === false
  const genderRatio3M2F = game.genderRatio === '3M/2F'
  const genderRatio2M3F = game.genderRatio === '2M/3F'
  
  // Game progress
  const homeTimeoutsCount = game.homeTimeouts?.length || 0
  const awayTimeoutsCount = game.awayTimeouts?.length || 0
  const homeSpiritTimeoutsCount = game.homeSpiritTimeouts?.length || 0
  const awaySpiritTimeoutsCount = game.awaySpiritTimeouts?.length || 0
  const secondHalfStartTimeFormatted = game.secondHalfStartTime
    ? game.secondHalfStartTime.toDate().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : ''

  // Generate home roster rows
  const homeRosterHtml = game.homeRoster
    .map(p => `<tr><td class="center">${p.number}</td><td>${escapeHtml(p.playerName)}</td></tr>`)
    .join('')
  const homeEmptyRowsHtml = Array(Math.max(0, maxRosterRows - game.homeRoster.length))
    .fill('<tr><td></td><td></td></tr>')
    .join('')

  // Generate away roster rows
  const awayRosterHtml = game.awayRoster
    .map(p => `<tr><td class="center">${p.number}</td><td>${escapeHtml(p.playerName)}</td></tr>`)
    .join('')
  const awayEmptyRowsHtml = Array(Math.max(0, maxRosterRows - game.awayRoster.length))
    .fill('<tr><td></td><td></td></tr>')
    .join('')

  // Generate scoring rows
  const scoringRowsHtml = Array.from({ length: maxScoringRows })
    .map((_, i) => {
      const event = events[i]
      const isTeamA = event?.teamId === game.homeTeamId
      const timeStr = event?.scoredAt 
        ? event.scoredAt.toDate().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : ''
      return `
        <tr>
          <td class="center">${i + 1}</td>
          <td class="center">${event && isTeamA ? '*' : ''}</td>
          <td class="center">${event && !isTeamA ? '*' : ''}</td>
          <td class="center">${event?.assisterNumber ?? ''}</td>
          <td class="center">${event?.scorerNumber ?? ''}</td>
          <td class="center">${timeStr}</td>
          <td class="center">${event ? `${event.homeScore} - ${event.awayScore}` : ''}</td>
        </tr>
      `
    })
    .join('')

  // Home signature HTML
  const homeSignatureHtml = game.homeTeamSignature
    ? `<img src="${game.homeTeamSignature}" class="signature-img" alt="Home team captain signature">`
    : ''

  // Away signature HTML
  const awaySignatureHtml = game.awayTeamSignature
    ? `<img src="${game.awayTeamSignature}" class="signature-img" alt="Away team captain signature">`
    : ''

  return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(game.homeTeamName)} vs ${escapeHtml(game.awayTeamName)} - Game Protocol</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      padding: 10px;
      background: white;
    }
    
    .container {
      display: flex;
      gap: 20px;
      max-width: 1200px;
    }
    
    .left-section {
      flex: 1;
      min-width: 400px;
    }
    
    .right-section {
      width: 320px;
    }
    
    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 10px;
    }
    
    th, td {
      border: 1px solid #000;
      padding: 4px 6px;
      text-align: left;
    }
    
    th {
      background: #e5e7eb;
      font-weight: bold;
    }
    
    .center {
      text-align: center;
    }
    
    .bold {
      font-weight: bold;
    }
    
    .header-table th,
    .header-table td {
      text-align: center;
    }
    
    .title-cell {
      font-size: 12px;
      font-weight: bold;
      background: #e5e7eb;
    }
    
    .team-row td:first-child {
      font-weight: bold;
      width: 60px;
    }
    
    .settings-table {
      width: auto;
    }
    
    .settings-table td {
      min-width: 50px;
    }
    
    .scorekeepers-box {
      border: 1px solid #000;
      min-height: 60px;
      padding: 4px;
    }
    
    .gender-ratio {
      margin: 10px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .gender-ratio input[type="checkbox"] {
      width: 14px;
      height: 14px;
    }
    
    .roster-section {
      display: flex;
      gap: 15px;
    }
    
    .roster-table {
      flex: 1;
    }
    
    .roster-table td {
      height: 20px;
    }
    
    .roster-table th:first-child,
    .roster-table td:first-child {
      width: 30px;
      text-align: center;
    }
    
    .scoring-table th,
    .scoring-table td {
      text-align: center;
      padding: 2px 4px;
    }
    
    .scoring-table td:first-child {
      width: 25px;
    }
    
    .final-score {
      font-size: 16px;
      font-weight: bold;
    }
    
    .signature-cell {
      height: 45px;
      min-height: 45px;
      width: 120px;
      vertical-align: middle;
    }
    
    .signature-img {
      width: 100%;
      height: 100%;
      max-height: 37px;
      object-fit: contain;
      display: block;
    }
    
    .no-print {
      margin-bottom: 15px;
    }
    
    @media print {
      .no-print {
        display: none;
      }
      
      body {
        padding: 0;
        font-size: 10px;
      }
      
      .container {
        gap: 15px;
      }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()" style="padding: 10px 20px; font-size: 14px; cursor: pointer; background: #2563eb; color: white; border: none; border-radius: 4px;">
      🖨️ Print / Save as PDF
    </button>
  </div>

  <!-- Header -->
  <table class="header-table">
    <tbody>
      <tr>
        <th rowspan="2" class="title-cell" style="width: 150px;">
          ${escapeHtml(game.tournamentName)}<br>Scoresheet
        </th>
        <th>Date</th>
        <th>Time</th>
        <th>Field</th>
        <th>Division</th>
        <th>Pool / Bracket</th>
        <th>Game #</th>
      </tr>
      <tr>
        <td>${formattedDate}</td>
        <td>${formattedTime}</td>
        <td>${escapeHtml(game.field || '')}</td>
        <td>${escapeHtml(game.division || '')}</td>
        <td>${escapeHtml(game.poolOrBracket || '')}</td>
        <td>${escapeHtml(game.gameNumber || '')}</td>
      </tr>
    </tbody>
  </table>

  <div class="container">
    <div class="left-section">
      <!-- Teams -->
      <table style="margin-bottom: 10px;">
        <tbody>
          <tr class="team-row">
            <td>Team A</td>
            <td colspan="3">${escapeHtml(game.homeTeamName)}</td>
          </tr>
          <tr class="team-row">
            <td>Team B</td>
            <td colspan="3">${escapeHtml(game.awayTeamName)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Game Settings & Scorekeepers -->
      <div style="display: flex; gap: 15px; margin-bottom: 10px;">
        <table class="settings-table" style="width: auto;">
          <tbody>
            <tr>
              <th colspan="3">Game starting settings</th>
            </tr>
            <tr>
              <td class="center bold">A</td>
              <td class="center bold">Teams</td>
              <td class="center bold">B</td>
            </tr>
            <tr>
              <td class="center">${homeStartsOffense ? '✓' : ''}</td>
              <td class="center">Offense</td>
              <td class="center">${awayStartsOffense ? '✓' : ''}</td>
            </tr>
            <tr>
              <td class="center">${homeStartsLeft ? '✓' : ''}</td>
              <td class="center">Endzone</td>
              <td class="center">${homeStartsRight ? '✓' : ''}</td>
            </tr>
          </tbody>
        </table>
        
        <div style="flex: 1;">
          <div style="background: #e5e7eb; border: 1px solid #000; padding: 4px; font-weight: bold;">
            Scorekeepers
          </div>
          <div class="scorekeepers-box">${game.scorekeeper ? escapeHtml(game.scorekeeper) : ''}</div>
        </div>
      </div>

      <!-- Gender Ratio -->
      <div class="gender-ratio">
        <strong>Gender ratio on 1st point (*):</strong>
        <label><input type="checkbox" ${genderRatio3M2F ? 'checked' : ''}> 3M / 2F</label>
        <label><input type="checkbox" ${genderRatio2M3F ? 'checked' : ''}> 2M / 3F</label>
        <em>(mixed only)</em>
      </div>

      <!-- Rosters -->
      <div class="roster-section">
        <table class="roster-table">
          <tbody>
            <tr>
              <th colspan="2">Team A roster</th>
            </tr>
            <tr>
              <th>#</th>
              <th>Name</th>
            </tr>
            ${homeRosterHtml}
            ${homeEmptyRowsHtml}
            <tr>
              <td colspan="2">Total: <strong>${game.homeRoster.length}</strong></td>
            </tr>
          </tbody>
        </table>
        
        <table class="roster-table">
          <tbody>
            <tr>
              <th colspan="2">Team B roster</th>
            </tr>
            <tr>
              <th>#</th>
              <th>Name</th>
            </tr>
            ${awayRosterHtml}
            ${awayEmptyRowsHtml}
            <tr>
              <td colspan="2">Total: <strong>${game.awayRoster.length}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Time-outs -->
      <div style="display: flex; gap: 15px; margin-top: 10px;">
        <table style="width: auto;">
          <tbody>
            <tr><th colspan="2">Time-outs</th></tr>
            <tr><td>Team A</td><td style="width: 60px; text-align: center;">${homeTimeoutsCount || ''}</td></tr>
            <tr><td>Team B</td><td style="text-align: center;">${awayTimeoutsCount || ''}</td></tr>
          </tbody>
        </table>
        
        <table style="width: auto;">
          <tbody>
            <tr><th colspan="2">Spirit time-outs</th></tr>
            <tr><td>Team A</td><td style="width: 60px; text-align: center;">${homeSpiritTimeoutsCount || ''}</td></tr>
            <tr><td>Team B</td><td style="text-align: center;">${awaySpiritTimeoutsCount || ''}</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Half-time & Second half -->
      <div style="display: flex; gap: 15px; margin-top: 10px;">
        <table style="width: auto;">
          <tbody>
            <tr><th colspan="4">Half-time score</th></tr>
            <tr>
              <td>Team A</td>
              <td style="width: 40px; height: 20px; text-align: center;">${game.halftimeHomeScore ?? ''}</td>
              <td>Team B</td>
              <td style="width: 40px; height: 20px; text-align: center;">${game.halftimeAwayScore ?? ''}</td>
            </tr>
          </tbody>
        </table>
        
        <table style="width: auto;">
          <tbody>
            <tr><th>Second half starts at</th></tr>
            <tr><td style="min-width: 120px; height: 20px; text-align: center;">${secondHalfStartTimeFormatted}</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Final Score & Signatures -->
      <table style="margin-top: 10px;">
        <tbody>
          <tr>
            <th></th>
            <th>Final Score</th>
            <th colspan="2">Captain's signature</th>
          </tr>
          <tr>
            <td>Team A</td>
            <td class="center final-score">${game.homeScore}</td>
            <td colspan="2" class="signature-cell">
              ${homeSignatureHtml}
            </td>
          </tr>
          <tr>
            <td>Team B</td>
            <td class="center final-score">${game.awayScore}</td>
            <td colspan="2" class="signature-cell">
              ${awaySignatureHtml}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="right-section">
      <!-- Scoring Table -->
      <table class="scoring-table">
        <tbody>
          <tr>
            <th colspan="3">Scoring team</th>
            <th colspan="2">Shirt numbers</th>
            <th>Time</th>
            <th>Score</th>
          </tr>
          <tr>
            <th></th>
            <th>A</th>
            <th>B</th>
            <th>Assist</th>
            <th>Goal</th>
            <th>Min:sec</th>
            <th>A - B</th>
          </tr>
          ${scoringRowsHtml}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`
}

// Helper to escape HTML special characters
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (char) => map[char])
}

// Function to open scoresheet in a new window
export function openGameScoresheet(game: Game, events: ScoringEvent[]): boolean {
  const newWindow = window.open('', '_blank')
  if (!newWindow) {
    return false
  }

  const html = generateScoresheetHtml({ game, events })
  newWindow.document.write(html)
  newWindow.document.close()

  return true
}
