import { accordionEntry } from './accordion'
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
  composerEntry, copyButtonEntry, errorBoundaryEntry, liveAnnouncerEntry, pageHeaderEntry,
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
  connectionStringEntry, migrationListEntry, queryEditorEntry, queryPlanEntry,
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
import type { Category, ComponentEntry } from './types'

export const CATEGORIES: Category[] = [
  {
    label: 'Forms',
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
    ],
  },
  {
    label: 'Display',
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
    ],
  },
  {
    label: 'Overlays',
    items: [
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
    ],
  },
  {
    label: 'Feedback',
    items: [alertEntry, bannerEntry, toastEntry, progressEntry, spinnerEntry],
  },
  {
    label: 'Crypto',
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
    items: [
      notificationInboxEntry,
      userMenuEntry,
      presenceEntry,
      mentionInputEntry,
    ],
  },
  {
    label: 'Utility',
    items: [
      copyButtonEntry,
      composerEntry,
      themeToggleEntry,
      pageHeaderEntry,
      skipLinkEntry,
      visuallyHiddenEntry,
      liveAnnouncerEntry,
      errorBoundaryEntry,
    ],
  },
  {
    label: 'Operations',
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
    label: 'AI',
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
    items: [
      cartEntry,
      checkoutSummaryEntry,
      pricingTableEntry,
      subscriptionStateEntry,
    ],
  },
  {
    label: 'Auth',
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
    items: [
      riskScoreEntry,
      fraudVerdictEntry,
      ipClusterEntry,
      fingerprintDiffEntry,
    ],
  },
  {
    label: 'Analytics',
    items: [
      dateRangeCompareEntry,
      cohortTableEntry,
    ],
  },
  {
    label: 'Admin',
    items: [
      auditLogEntry,
      moderationQueueEntry,
      bulkActionBarEntry,
    ],
  },
  {
    label: 'Messaging',
    items: [
      threadListEntry,
      ticketCardEntry,
      typingIndicatorEntry,
      attachmentPreviewEntry,
    ],
  },
  {
    label: 'Media',
    items: [
      videoPlayerEntry,
      mediaGalleryEntry,
      uploadListEntry,
    ],
  },
  {
    label: 'Gaming',
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
    items: [
      campaignCardEntry,
      utmBuilderEntry,
      postbackConfigEntry,
      revenueShareTableEntry,
    ],
  },
  {
    label: 'Geo',
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
    label: 'Database',
    items: [
      queryEditorEntry,
      queryPlanEntry,
      schemaTableEntry,
      migrationListEntry,
      connectionStringEntry,
    ],
  },
  {
    label: 'Build & Perf',
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

export type { Category, ComponentEntry, DemoSpec } from './types'
