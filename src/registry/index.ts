import { accordionEntry } from './accordion'
import {
  abTestResultsEntry, attributionEntry, eventStreamEntry, retentionCurveEntry,
  segmentBuilderEntry,
} from './analytics-extra'
import {
  boxPlotEntry, radarChartEntry, sankeyEntry, scatterPlotEntry, treemapEntry,
} from './charts'
import {
  cascaderEntry, currencyInputEntry, emojiPickerEntry, phoneInputEntry,
  segmentedControlEntry, signaturePadEntry, transferEntry, treeSelectEntry,
} from './inputs'
import { imageCropperEntry, pdfViewerEntry } from './media-extra'
import {
  backToTopEntry, bottomNavEntry, cookieConsentEntry, popconfirmEntry,
  qrCodeEntry, resultEntry,
} from './patterns'
import { ganttEntry, orgChartEntry, schedulerEntry } from './views'
import {
  contextPickerEntry, messageEntry, modelSelectEntry, promptInputEntry,
  suggestionsEntry, tokenUsageEntry, toolCallEntry,
} from './ai'
import {
  branchSelectEntry, commitListEntry, deployListEntry, diffStatEntry,
  fileTreeEntry,
} from './dev'
import {
  chartEntry, envVarsEntry, gaugeEntry, incidentCardEntry, pipelineEntry,
  resourceMeterEntry, serviceStatusEntry, uptimeStripEntry,
} from './devops'
import {
  dataGridEntry, descriptionListEntry, dropzoneEntry, sparklineEntry,
  statEntry, stepperEntry, timelineEntry, treeEntry,
} from './foundations'
import {
  colorPickerEntry, maskInputEntry, multiSelectEntry, numberInputEntry,
  passwordInputEntry, rangeSliderEntry, ratingEntry, tagInputEntry,
  timePickerEntry,
} from './forms-extra'
import {
  bannerEntry, drawerEntry, menubarEntry, navigationMenuEntry,
  tableOfContentsEntry, toolbarEntry, tourEntry, typographyEntry,
} from './layout-extra'
import {
  donutEntry, funnelEntry, heatmapGridEntry, kanbanEntry, pricingTableEntry,
  virtualListEntry,
} from './data-extra'
import {
  apiKeysEntry, invoiceListEntry, mentionInputEntry, notificationInboxEntry,
  presenceEntry, userMenuEntry,
} from './product'
import {
  composerEntry, copyButtonEntry,
  countdownEntry, errorBoundaryEntry, liveAnnouncerEntry, logoEntry, pageHeaderEntry,
  skipLinkEntry, themeToggleEntry, visuallyHiddenEntry,
} from './utility'
import {
  blameViewEntry, cronScheduleEntry, dependencyListEntry, featureFlagEntry,
  healthChecksEntry, stackTraceEntry, testResultsEntry, trafficSplitEntry,
} from './dev-extra'
import {
  costBreakdownEntry, evalResultsEntry, onCallScheduleEntry,
  promptTemplateEntry, retrievalResultsEntry, topologyMapEntry,
} from './ai-ops-extra'
import {
  candlestickChartEntry, chainSelectEntry, gasTrackerEntry, marketTableEntry,
  nftCardEntry, orderBookEntry, priceTickerEntry, seedPhraseEntry,
  stakingPanelEntry, swapPanelEntry, tokenAmountEntry, tokenApprovalsEntry,
  transactionStatusEntry, walletAddressEntry, walletConnectEntry,
  bridgeStatusEntry, governanceProposalEntry, liquidityPositionEntry,
  mintPanelEntry, networkStatusEntry, portfolioBalanceEntry, tokenSelectEntry,
  transactionListEntry, validatorListEntry,
} from './crypto'
import { formEntry } from './form'
import {
  calendarEntry,
  carouselEntry,
  comboboxEntry,
  commandEntry,
  contextMenuEntry,
  datePickerEntry,
  emptyEntry,
  fieldEntry,
  resizableEntry,
} from './advanced'
import {
  agentStepsEntry, citationsEntry, confidenceMeterEntry, diffProposalEntry,
  feedbackEntry, modelComparisonEntry, reasoningBlockEntry, streamingTextEntry,
} from './ai-extra'
import {
  alertTriageEntry, anomalyChartEntry, rootCauseTreeEntry, runbookStepsEntry,
  sloBudgetEntry,
} from './aiops'
import { alertEntry } from './alert'
import { avatarEntry } from './avatar'
import { badgeEntry } from './badge'
import { breadcrumbEntry } from './breadcrumb'
import { buttonEntry } from './button'
import { buttonGroupEntry } from './button-group'
import { cardEntry } from './card'
import { checkboxEntry } from './checkbox'
import { codeBlockEntry } from './code-block'
import {
  codeSearchEntry, diffViewEntry, inputFileEntry, jsonViewerEntry,
  logViewerEntry, shortcutSheetEntry, terminalEntry,
} from './code'
import { collapsibleEntry } from './collapsible'
import { dialogEntry } from './dialog'
import { dropdownMenuEntry } from './dropdown-menu'
import { groupEntry } from './group'
import { inputEntry } from './input'
import {
  alertDialogEntry,
  aspectRatioEntry,
  hoverCardEntry,
  inputOtpEntry,
  kbdEntry,
  labelEntry,
  scrollAreaEntry,
  spinnerEntry,
  toggleEntry,
} from './misc'
import { paginationEntry } from './pagination'
import { popoverEntry } from './popover'
import { progressEntry } from './progress'
import { radioGroupEntry } from './radio-group'
import { selectEntry } from './select'
import { separatorEntry } from './separator'
import { sheetEntry } from './sheet'
import { sidebarEntry } from './sidebar'
import { skeletonEntry } from './skeleton'
import { sliderEntry } from './slider'
import { switchEntry } from './switch'
import { tableEntry } from './table'
import { tabsEntry } from './tabs'
import { textareaEntry } from './textarea'
import { toastEntry } from './toast'
import { tooltipEntry } from './tooltip'
import {
  commitGraphEntry, fmtEntry, labelPickerEntry, pullRequestCardEntry,
  releaseListEntry, reviewThreadEntry, statusChecksEntry,
} from './vcs'
import {
  cardInputEntry, ledgerTableEntry, moneyInputEntry, paymentMethodEntry,
  payoutStatusEntry,
} from './finance'
import {
  deviceListEntry, loginFormEntry, permissionMatrixEntry, sessionListEntry,
  twoFactorSetupEntry,
} from './auth'
import { cohortTableEntry, dateRangeCompareEntry } from './analytics'
import { auditLogEntry, bulkActionBarEntry, moderationQueueEntry } from './admin'
import {
  attachmentPreviewEntry, threadListEntry, ticketCardEntry,
  typingIndicatorEntry,
} from './messaging'
import { mediaGalleryEntry, uploadListEntry, videoPlayerEntry } from './media'
import {
  agentCardEntry,
  agentMemoryEntry,
  agentTasksEntry,
  budgetGuardEntry,
  retryPolicyEntry,
  streamInspectorEntry,
  subagentTreeEntry,
  contextWindowEntry,
  evalBoardEntry,
  promptDiffEntry,
  runControlsEntry,
  sandboxPolicyEntry,
  toolLatencyEntry,
  guardrailListEntry,
  handoffTrailEntry,
  inspectorEntry,
  nodeCanvasEntry,
  toolPickerEntry,
  toolSchemaEntry,
  traceWaterfallEntry,
} from './agents'
import { compareSliderEntry, imageEntry, masonryEntry } from './media'
import {
  assetGridEntry,
  audioPlayerEntry,
  backupListEntry,
  bucketListEntry,
  filePreviewEntry,
  objectListEntry,
  storageUsageEntry,
} from './storage'
import {
  knowledgeGraphEntry,
  markdownEditorEntry,
  markdownEntry,
  noteGraphEntry,
} from './knowledge'
import {
  connectionPoolEntry,
  csvPreviewEntry,
  dataQualityEntry,
  indexListEntry,
  replicationStatusEntry,
  slowQueryLogEntry,
  storyEntry,
} from './data'
import {
  fewShotEditorEntry,
  promptVariablesEntry,
  promptVersionsEntry,
  tokenInspectorEntry,
} from './prompts'
import {
  mcpCapabilityMatrixEntry,
  mcpConfigEditorEntry,
  mcpElicitationEntry,
  mcpRootsEntry,
  mcpSamplingEntry,
  mcpServerPickerEntry,
  toolDiffEntry,
  mcpPromptListEntry,
  mcpResourceListEntry,
  mcpServerCardEntry,
  rpcConsoleEntry,
  schemaFormEntry,
  toolApprovalEntry,
  toolResultEntry,
} from './mcp'
import {
  betInputEntry, leaderboardEntry, multiplierChartEntry, oddsDisplayEntry,
  roundHistoryEntry,
} from './gaming'
import {
  campaignCardEntry, postbackConfigEntry, revenueShareTableEntry,
  utmBuilderEntry,
} from './affiliate'
import {
  fingerprintDiffEntry, fraudVerdictEntry, ipClusterEntry, riskScoreEntry,
} from './security'
import { cartEntry, checkoutSummaryEntry, subscriptionStateEntry } from './commerce'
import {
  addressInputEntry, coordinateInputEntry, locationPickerEntry, mapEmbedEntry,
  timezoneSelectEntry,
} from './geo'
import {
  curlCommandEntry, endpointListEntry, httpStatusEntry, requestBuilderEntry,
  responseViewerEntry, schemaViewerEntry, webhookInspectorEntry,
} from './api'
import {
  connectionStringEntry, migrationListEntry, queryConstructorEntry,
  queryEditorEntry, queryPlanEntry,
  schemaTableEntry,
} from './database'
import {
  benchmarkTableEntry, buildLogEntry, bundleTreemapEntry, coverageReportEntry,
  flameGraphEntry, lighthouseScoreEntry,
} from './build'
import {
  changelogEntryEntry, jwtInspectorEntry, mergeConflictEntry, regexTesterEntry,
  symbolOutlineEntry,
} from './codetools'
import {
  cacheStatsEntry, containerListEntry, envDiffEntry, portTableEntry,
  queueMonitorEntry, rateLimitMeterEntry, webSocketFramesEntry,
} from './runtime'
import type { Category, ComponentEntry, Tier } from './types'

export const CATEGORIES: Category[] = [
  {
    label: 'Forms',
    tier: 'basic',
    items: [
      buttonEntry,
      buttonGroupEntry,
      inputEntry,
      textareaEntry,
      labelEntry,
      checkboxEntry,
      radioGroupEntry,
      switchEntry,
      selectEntry,
      sliderEntry,
      toggleEntry,
      comboboxEntry,
      datePickerEntry,
      inputOtpEntry,
      fieldEntry,
      formEntry,
      dropzoneEntry,
      inputFileEntry,
      numberInputEntry,
      passwordInputEntry,
      tagInputEntry,
      multiSelectEntry,
      maskInputEntry,
      timePickerEntry,
      colorPickerEntry,
      rangeSliderEntry,
      ratingEntry,
      segmentedControlEntry,
      phoneInputEntry,
      currencyInputEntry,
      signaturePadEntry,
      transferEntry,
      cascaderEntry,
      treeSelectEntry,
      emojiPickerEntry,
    
    ],
  },
  {
    label: 'Display',
    tier: 'basic',
    items: [
      cardEntry,
      groupEntry,
      codeBlockEntry,
      badgeEntry,
      avatarEntry,
      tableEntry,
      dataGridEntry,
      statEntry,
      sparklineEntry,
      chartEntry,
      gaugeEntry,
      donutEntry,
      funnelEntry,
      heatmapGridEntry,
      typographyEntry,
      kanbanEntry,
      descriptionListEntry,
      fmtEntry,
      separatorEntry,
      skeletonEntry,
      aspectRatioEntry,
      kbdEntry,
      calendarEntry,
      carouselEntry,
      emptyEntry,
    ],
  },
  {
    label: 'Navigation',
    tier: 'basic',
    items: [
      tabsEntry,
      accordionEntry,
      collapsibleEntry,
      breadcrumbEntry,
      stepperEntry,
      timelineEntry,
      toolbarEntry,
      menubarEntry,
      navigationMenuEntry,
      tableOfContentsEntry,
      virtualListEntry,
      treeEntry,
      paginationEntry,
      sidebarEntry,
      scrollAreaEntry,
      resizableEntry,
      bottomNavEntry,
      backToTopEntry,
    
    ],
  },
  {
    label: 'Overlays',
    tier: 'basic',
    items: [
      storyEntry,
      dialogEntry,
      alertDialogEntry,
      sheetEntry,
      drawerEntry,
      tourEntry,
      popoverEntry,
      dropdownMenuEntry,
      tooltipEntry,
      hoverCardEntry,
      contextMenuEntry,
      commandEntry,
      popconfirmEntry,
    
    ],
  },
  {
    label: 'Feedback',
    tier: 'basic',
    items: [alertEntry, bannerEntry, toastEntry, progressEntry, spinnerEntry,
      resultEntry,
    ],
  },
  {
    label: 'Crypto',
    tier: 'block',
    items: [
      walletConnectEntry,
      walletAddressEntry,
      tokenAmountEntry,
      tokenSelectEntry,
      chainSelectEntry,
      networkStatusEntry,
      portfolioBalanceEntry,
      transactionListEntry,
      swapPanelEntry,
      transactionStatusEntry,
      gasTrackerEntry,
      tokenApprovalsEntry,
      stakingPanelEntry,
      priceTickerEntry,
      marketTableEntry,
      candlestickChartEntry,
      orderBookEntry,
      nftCardEntry,
      mintPanelEntry,
      bridgeStatusEntry,
      liquidityPositionEntry,
      governanceProposalEntry,
      validatorListEntry,
      seedPhraseEntry,
    ],
  },
  {
    label: 'Product',
    tier: 'block',
    items: [
      notificationInboxEntry,
      userMenuEntry,
      presenceEntry,
      mentionInputEntry,
    ],
  },
  {
    label: 'Utility',
    tier: 'basic',
    items: [
      countdownEntry,
      copyButtonEntry,
      composerEntry,
      logoEntry,
      themeToggleEntry,
      pageHeaderEntry,
      skipLinkEntry,
      visuallyHiddenEntry,
      liveAnnouncerEntry,
      errorBoundaryEntry,
      qrCodeEntry,
      cookieConsentEntry,
    
    ],
  },
  {
    label: 'Operations',
    tier: 'block',
    items: [
      pipelineEntry,
      serviceStatusEntry,
      uptimeStripEntry,
      resourceMeterEntry,
      incidentCardEntry,
      envVarsEntry,
      healthChecksEntry,
      cronScheduleEntry,
      featureFlagEntry,
      trafficSplitEntry,
    ],
  },
  {
    label: 'Development',
    tier: 'block',
    items: [
      fileTreeEntry,
      commitListEntry,
      deployListEntry,
      branchSelectEntry,
      diffStatEntry,
      diffViewEntry,
      terminalEntry,
      logViewerEntry,
      jsonViewerEntry,
      codeSearchEntry,
      shortcutSheetEntry,
      statusChecksEntry,
      testResultsEntry,
      stackTraceEntry,
      blameViewEntry,
      dependencyListEntry,
      pullRequestCardEntry,
      reviewThreadEntry,
      labelPickerEntry,
      releaseListEntry,
      commitGraphEntry,
    ],
  },
  {
    label: 'Agents',
    tier: 'block',
    items: [
      inspectorEntry,
      agentCardEntry,
      toolPickerEntry,
      toolSchemaEntry,
      runControlsEntry,
      agentTasksEntry,
      subagentTreeEntry,
      traceWaterfallEntry,
      streamInspectorEntry,
      contextWindowEntry,
      guardrailListEntry,
      sandboxPolicyEntry,
      handoffTrailEntry,
      agentMemoryEntry,
      budgetGuardEntry,
      retryPolicyEntry,
      promptDiffEntry,
      evalBoardEntry,
      toolLatencyEntry,
    ],
  },
  {
    label: 'MCP',
    tier: 'block',
    items: [
      mcpServerCardEntry,
      mcpServerPickerEntry,
      mcpConfigEditorEntry,
      mcpRootsEntry,
      mcpCapabilityMatrixEntry,
      mcpResourceListEntry,
      mcpPromptListEntry,
      rpcConsoleEntry,
      toolApprovalEntry,
      toolResultEntry,
      toolDiffEntry,
      schemaFormEntry,
      mcpSamplingEntry,
      mcpElicitationEntry,
    ],
  },
  {
    label: 'Prompts',
    tier: 'block',
    items: [
      promptVariablesEntry,
      promptVersionsEntry,
      fewShotEditorEntry,
      tokenInspectorEntry,
    ],
  },
  {
    label: 'AI',
    tier: 'block',
    items: [
      promptInputEntry,
      messageEntry,
      contextPickerEntry,
      toolCallEntry,
      modelSelectEntry,
      tokenUsageEntry,
      suggestionsEntry,
      streamingTextEntry,
      reasoningBlockEntry,
      citationsEntry,
      agentStepsEntry,
      diffProposalEntry,
      modelComparisonEntry,
      confidenceMeterEntry,
      feedbackEntry,
      retrievalResultsEntry,
      promptTemplateEntry,
      evalResultsEntry,
      costBreakdownEntry,
    ],
  },
  {
    label: 'AIOps',
    tier: 'block',
    items: [
      alertTriageEntry,
      anomalyChartEntry,
      rootCauseTreeEntry,
      runbookStepsEntry,
      sloBudgetEntry,
      topologyMapEntry,
      onCallScheduleEntry,
    ],
  },
  {
    label: 'Finance',
    tier: 'block',
    items: [
      moneyInputEntry,
      cardInputEntry,
      paymentMethodEntry,
      invoiceListEntry,
      payoutStatusEntry,
      ledgerTableEntry,
    ],
  },
  {
    label: 'Commerce',
    tier: 'block',
    items: [
      cartEntry,
      checkoutSummaryEntry,
      pricingTableEntry,
      subscriptionStateEntry,
    ],
  },
  {
    label: 'Auth',
    tier: 'block',
    items: [
      loginFormEntry,
      twoFactorSetupEntry,
      sessionListEntry,
      deviceListEntry,
      permissionMatrixEntry,
      apiKeysEntry,
    ],
  },
  {
    label: 'Security',
    tier: 'block',
    items: [
      riskScoreEntry,
      fraudVerdictEntry,
      ipClusterEntry,
      fingerprintDiffEntry,
    ],
  },
  {
    label: 'Analytics',
    tier: 'block',
    items: [
      dateRangeCompareEntry,
      cohortTableEntry,
      abTestResultsEntry,
      retentionCurveEntry,
      eventStreamEntry,
      segmentBuilderEntry,
      attributionEntry,
    
    ],
  },
  {
    label: 'Admin',
    tier: 'block',
    items: [
      auditLogEntry,
      moderationQueueEntry,
      bulkActionBarEntry,
    ],
  },
  {
    label: 'Messaging',
    tier: 'block',
    items: [
      threadListEntry,
      ticketCardEntry,
      typingIndicatorEntry,
      attachmentPreviewEntry,
    ],
  },
  {
    label: 'Media',
    tier: 'basic',
    items: [
      imageEntry,
      audioPlayerEntry,
      compareSliderEntry,
      masonryEntry,
      videoPlayerEntry,
      mediaGalleryEntry,
      uploadListEntry,
      pdfViewerEntry,
      imageCropperEntry,
    
    ],
  },
  {
    label: 'Gaming',
    tier: 'block',
    items: [
      betInputEntry,
      oddsDisplayEntry,
      multiplierChartEntry,
      roundHistoryEntry,
      leaderboardEntry,
    ],
  },
  {
    label: 'Affiliate',
    tier: 'block',
    items: [
      campaignCardEntry,
      utmBuilderEntry,
      postbackConfigEntry,
      revenueShareTableEntry,
    ],
  },
  {
    label: 'Geo',
    tier: 'basic',
    items: [
      mapEmbedEntry,
      locationPickerEntry,
      addressInputEntry,
      coordinateInputEntry,
      timezoneSelectEntry,
    ],
  },
  {
    label: 'API',
    tier: 'block',
    items: [
      requestBuilderEntry,
      responseViewerEntry,
      endpointListEntry,
      schemaViewerEntry,
      webhookInspectorEntry,
      curlCommandEntry,
      httpStatusEntry,
    ],
  },
  {
    label: 'Knowledge',
    tier: 'basic',
    items: [noteGraphEntry, knowledgeGraphEntry, markdownEntry, markdownEditorEntry],
  },
  {
    label: 'Charts',
    tier: 'basic',
    items: [scatterPlotEntry, radarChartEntry, sankeyEntry, treemapEntry, boxPlotEntry],
  },
  {
    label: 'Views',
    tier: 'basic',
    // `node-canvas` lives here rather than under Agents: a pannable graph of
    // nodes and edges is a generic surface, and filing it with the agent
    // components implied it only made sense for one of them.
    items: [nodeCanvasEntry, ganttEntry, schedulerEntry, orgChartEntry],
  },
  {
    label: 'Storage',
    tier: 'block',
    items: [
      storageUsageEntry,
      bucketListEntry,
      objectListEntry,
      assetGridEntry,
      filePreviewEntry,
      backupListEntry,
    ],
  },
  {
    label: 'Data',
    tier: 'block',
    items: [
      slowQueryLogEntry,
      indexListEntry,
      replicationStatusEntry,
      connectionPoolEntry,
      csvPreviewEntry,
      dataQualityEntry,
    ],
  },
  {
    label: 'Database',
    tier: 'block',
    items: [
      queryEditorEntry,
      queryConstructorEntry,
      queryPlanEntry,
      schemaTableEntry,
      migrationListEntry,
      connectionStringEntry,
    ],
  },
  {
    label: 'Build & Perf',
    tier: 'block',
    items: [
      buildLogEntry,
      bundleTreemapEntry,
      coverageReportEntry,
      benchmarkTableEntry,
      flameGraphEntry,
      lighthouseScoreEntry,
    ],
  },
  {
    label: 'Code Tools',
    tier: 'block',
    items: [
      regexTesterEntry,
      mergeConflictEntry,
      symbolOutlineEntry,
      changelogEntryEntry,
      jwtInspectorEntry,
    ],
  },
  {
    label: 'Runtime',
    tier: 'block',
    items: [
      containerListEntry,
      portTableEntry,
      envDiffEntry,
      queueMonitorEntry,
      cacheStatsEntry,
      rateLimitMeterEntry,
      webSocketFramesEntry,
    ],
  },
]

export const ENTRIES: ComponentEntry[] = CATEGORIES.flatMap((c) => c.items)

/**
 * The two halves of the kit, in the order they are always presented.
 *
 * The copy lives here rather than in each screen because the rail, the index
 * and the landing page all name these groups, and three descriptions that
 * drift apart is three chances to describe the kit differently.
 */
export const TIERS: { id: Tier; label: string; blurb: string }[] = [
  {
    id: 'basic',
    label: 'Basics',
    blurb:
      'The vocabulary. Buttons, fields, dialogs, tables, charts — components ' +
      'that encode no business concept, so they belong in any product.',
  },
  {
    id: 'block',
    label: 'Blocks',
    blurb:
      'Built on the basics, for one job each. A block already knows what a ' +
      'commit is, or a wallet, an invoice, a span — the part normally rebuilt ' +
      'from scratch on every project.',
  },
]

/**
 * Categories grouped into the two tiers, preserving the order they are
 * declared in above.
 *
 * Derived rather than stored as two arrays, so a category cannot end up in
 * both halves or in neither.
 */
export const TIERED: { id: Tier; label: string; blurb: string; categories: Category[] }[] =
  TIERS.map((tier) => ({
    ...tier,
    categories: CATEGORIES.filter((category) => category.tier === tier.id),
  }))

/** Every component in one tier — the count the index and rail both quote. */
export function tierCount(tier: Tier) {
  return CATEGORIES.filter((category) => category.tier === tier).reduce(
    (total, category) => total + category.items.length,
    0,
  )
}

export function findEntry(id: string) {
  return ENTRIES.find((entry) => entry.id === id)
}

/**
 * Whether a component has something to show.
 *
 * A composer counts as much as a worked example. This predicate originally
 * checked `demos` alone, which predates the composer being the primary way a
 * component is demonstrated — an entry with a live playground and a full props
 * table was being rendered as "Not built yet".
 */
export function isReady(entry: ComponentEntry) {
  return Boolean(entry.demos?.length || entry.composer)
}

/** Route for a component page. */
/** The category an entry belongs to — for breadcrumbs and grouped indexes. */
export function findCategory(id: string) {
  return CATEGORIES.find((category) =>
    category.items.some((entry) => entry.id === id),
  )
}

export function componentPath(id: string) {
  return `/components/${id}`
}

export type { Category, ComponentEntry, DemoSpec, Tier } from './types'
