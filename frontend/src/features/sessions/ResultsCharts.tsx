import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { LeaderboardRow, QuestionBreakdown, SessionResultsResponse } from '../../lib/api/types'
import { Card, CardHeader } from '../../components/ui/Feedback'
import { ChartLegend, ChartTooltip } from '../../components/ui/charts/ChartTooltip'
import { StackedShareBar, StatTile } from '../../components/ui/charts/StatTile'
import { BAR_SIZE, axisProps, chartColors } from '../../components/ui/charts/chartTheme'

/**
 * A question paired with the number it is shown under. That number is its position in
 * these results, not in the quiz: a flexible session arrives already in the order the
 * host asked, and numbering it 1..n is what makes "Q3" mean the third question asked.
 * For a static session the two are the same thing.
 */
interface NumberedQuestion {
  question: QuestionBreakdown
  number: number
}

function numbered(questions: QuestionBreakdown[]): NumberedQuestion[] {
  return questions.map((question, index) => ({ question, number: index + 1 }))
}

/** Free text is collected, never graded, so it has no place in an accuracy chart. */
function gradedQuestions(questions: NumberedQuestion[]) {
  return questions.filter((entry) => entry.question.type !== 'FREE_TEXT')
}

function percent(part: number, whole: number) {
  return whole === 0 ? 0 : Math.round((part / whole) * 100)
}

/**
 * Recharts hands a Cell's props straight through to the rectangle it draws, so a
 * per-row corner radius works at runtime — only Cell's own typing narrows `radius` to
 * the single number an SVG attribute would take.
 */
function cellRadius(radius: [number, number, number, number] | 0) {
  return radius as unknown as number
}

/**
 * The charts that open the results page. Everything here is derived from the same
 * payload the breakdown cards below print as numbers, so the two always agree — and
 * every value a tooltip shows is also on the page as a badge or a leaderboard row.
 */
export function ResultsOverview({ data }: { data: SessionResultsResponse }) {
  const graded = gradedQuestions(numbered(data.questions))
  const totalCorrect = graded.reduce((sum, entry) => sum + entry.question.correctCount, 0)
  const totalWrong = graded.reduce((sum, entry) => sum + entry.question.incorrectCount, 0)
  const totalGradedAnswers = totalCorrect + totalWrong
  const answersCollected = data.questions.reduce((sum, question) => sum + question.answerCount, 0)

  return (
    <div className="mb-6 space-y-4">
      <Card>
        <CardHeader
          title="Overview"
          description={
            data.surveyMode
              ? 'Nothing was graded in this session, so only participation is summarised.'
              : 'Every answer given in this session, pooled across the graded questions.'
          }
        />
        <div className="space-y-5 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Participants" value={data.participantCount} />
            <StatTile
              label="Questions asked"
              value={data.questionCount}
              hint={
                data.quizQuestionCount > data.questionCount
                  ? `${data.quizQuestionCount - data.questionCount} never asked`
                  : undefined
              }
            />
            <StatTile label="Answers collected" value={answersCollected} />
            {data.surveyMode ? (
              <StatTile
                label="Response rate"
                value={`${percent(answersCollected, data.participantCount * data.questionCount)}%`}
                hint="Of every answer that could have been given"
              />
            ) : (
              <StatTile
                label="Overall accuracy"
                value={`${percent(totalCorrect, totalGradedAnswers)}%`}
                hint={`${totalCorrect} of ${totalGradedAnswers} graded answers`}
              />
            )}
          </div>

          {!data.surveyMode && totalGradedAnswers > 0 && (
            <StackedShareBar
              shares={[
                { label: 'correct', value: totalCorrect, color: chartColors.correct },
                { label: 'wrong', value: totalWrong, color: chartColors.wrong },
              ]}
            />
          )}
        </div>
      </Card>

      {!data.surveyMode && graded.length > 0 && totalGradedAnswers > 0 && (
        <AccuracyByQuestionChart questions={graded} />
      )}

      <ScoreDistributionChart rows={data.leaderboard} />
    </div>
  )
}

interface QuestionDatum {
  label: string
  text: string
  correct: number
  wrong: number
}

/**
 * The chart the numbers alone cannot give you: which questions the room found hard.
 * Bars are counts rather than percentages so a question half the room skipped reads as
 * a short bar, instead of quietly inflating to full width.
 */
function AccuracyByQuestionChart({ questions }: { questions: NumberedQuestion[] }) {
  const rows: QuestionDatum[] = questions.map(({ question, number }) => ({
    label: `Q${number}`,
    text: question.text ?? '(image only)',
    correct: question.correctCount,
    wrong: question.incorrectCount,
  }))

  // Sized to fit the plot AND the axis band underneath it, so the card never grows its
  // own little scrollbar around a clipped axis.
  const height = rows.length * 30 + 36

  return (
    <Card>
      <CardHeader
        title="Accuracy by question"
        description="In the order they were asked, so a run of short bars also shows where people dropped out."
      />
      <div className="px-5 py-4">
        <div className="mb-4">
          <ChartLegend
            items={[
              { label: 'Correct', color: chartColors.correct },
              { label: 'Wrong', color: chartColors.wrong },
            ]}
          />
        </div>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart layout="vertical" data={rows} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid horizontal={false} stroke={chartColors.grid} />
            <XAxis type="number" allowDecimals={false} {...axisProps} />
            <YAxis type="category" dataKey="label" width={40} {...axisProps} />
            <Tooltip
              cursor={{ fill: '#f1f5f9' }}
              content={
                <ChartTooltip
                  heading={(entry) => String(entry.payload?.text ?? '')}
                  footer={(entry) => {
                    const row = entry.payload as QuestionDatum | undefined
                    if (!row) {
                      return undefined
                    }
                    const answered = row.correct + row.wrong
                    return answered === 0
                      ? 'Nobody answered this one'
                      : `${percent(row.correct, answered)}% correct of ${answered} answers`
                  }}
                />
              }
            />
            {/* A 2px stroke in the surface colour is the gap between the two segments —
                white doing the separating, rather than a border drawn around the marks. */}
            <Bar
              dataKey="correct"
              name="Correct"
              stackId="answers"
              fill={chartColors.correct}
              stroke={chartColors.surface}
              strokeWidth={2}
              barSize={BAR_SIZE}
            >
              {rows.map((row) => (
                // The rounded end belongs to whichever segment actually ends the bar.
                <Cell key={row.label} radius={cellRadius(row.wrong === 0 ? [0, 4, 4, 0] : 0)} />
              ))}
            </Bar>
            <Bar
              dataKey="wrong"
              name="Wrong"
              stackId="answers"
              fill={chartColors.wrong}
              stroke={chartColors.surface}
              strokeWidth={2}
              barSize={BAR_SIZE}
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

const BIN_COUNT = 5
/** Below this a histogram is just the leaderboard with the names taken off. */
const MIN_ROWS_FOR_HISTOGRAM = 5

/**
 * How the scores spread out — one tight cluster, or a class splitting in two. The
 * leaderboard beside it is the per-participant view; this is the shape of it.
 */
function ScoreDistributionChart({ rows }: { rows: LeaderboardRow[] }) {
  const top = Math.max(0, ...rows.map((row) => row.score))
  if (rows.length < MIN_ROWS_FOR_HISTOGRAM || top === 0) {
    return null
  }

  const width = Math.ceil((top + 1) / BIN_COUNT)
  const bins = Array.from({ length: BIN_COUNT }, (_, index) => {
    const low = index * width
    const high = low + width - 1
    return {
      label: low === high ? `${low}` : `${low}–${high}`,
      participants: rows.filter((row) => row.score >= low && row.score <= high).length,
    }
  })

  return (
    <Card>
      <CardHeader
        title="Score distribution"
        description={`How the final scores of ${rows.length} participants spread out.`}
      />
      <div className="px-5 py-4">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={bins} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={chartColors.grid} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis allowDecimals={false} width={32} {...axisProps} />
            <Tooltip
              cursor={{ fill: '#f1f5f9' }}
              content={<ChartTooltip heading={(entry) => `Score ${entry.payload?.label ?? ''}`} />}
            />
            {/* One series, one colour: shading each bar by its own height would spend the
                only free channel restating the bar length. */}
            <Bar
              dataKey="participants"
              name="Participants"
              fill={chartColors.accent}
              barSize={24}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
