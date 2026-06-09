// ESLint rule: no-math-in-glass
// Prevents ranking/scoring utilities from being imported into the CommitCard surface.
// Scoped to: TargetPacket (path includes 'targetpacket')
// Enforcement: Phase A boundary contract — CommitSurface must be a pure presentation layer.
// Install: npm i -D eslint then wire via eslint.config.js

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'No ranking or math utilities may be imported into the CommitCard surface layer.',
    },
  },
  create(context) {
    const filename = context.getFilename();
    if (!filename.includes('targetpacket')) return {};
    return {
      ImportDeclaration(node) {
        if (/score|rank|sort(?!ed)|aiae|arbitrat|math/i.test(node.source.value)) {
          // Allow existing wired imports: querysynthesis (synthesis only), telemetry
          const allowed = /querysynthesis|telemetry|leveragefield/.test(node.source.value);
          if (!allowed) {
            context.report({
              node,
              message: `CommitCard surface boundary violation: '${node.source.value}' imports ranking or math utilities. Move computation upstream.`,
            });
          }
        }
      },
    };
  },
};
