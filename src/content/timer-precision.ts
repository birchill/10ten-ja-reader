export async function hasReasonableTimerResolution(): Promise<boolean> {
  const waitALittle = async () =>
    new Promise((resolve) => setTimeout(resolve, 10));

  // If performance.now() returns different times at least three out of five
  // times then we can assume that we're not doing timer clamping of the sort
  // that would confuse our speed calculations.
  const numSamples: number = 5;
  const samples: number[] = [];
  samples.push(performance.now());
  for (let i = 1; i < numSamples; i++) {
    await waitALittle();
    samples.push(performance.now());
  }

  const context: { same: number; previous?: number } = { same: 0 };
  const { same: identicalPairs } = samples.reduce(
    (context, current) => ({
      same: current === context.previous ? context.same + 1 : context.same,
      previous: current,
    }),
    context
  );

  return identicalPairs < 2;
}
