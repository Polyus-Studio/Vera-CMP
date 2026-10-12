import type * as CC from 'vanilla-cookieconsent'
import { deepMerge } from './merge'
import type { Category, PrivacyConsentConfig, SupportedLocale } from './types'

interface BuildOptions {
  gpcActive: boolean
  gpcDeniedCategories: Category[]
  /** `gpc.lockDeniedCategories` — whether denied categories can be enabled. */
  gpcLocked: boolean
  showGpcNotice: boolean
}

function link(href: string | undefined, text: string): string {
  if (!href) return text
  return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`
}

/** Localized display labels per category. */
const CATEGORY_LABELS: Record<SupportedLocale, Record<Category, string>> = {
  en: {
    necessary: 'Strictly necessary',
    functional: 'Functional',
    analytics: 'Analytics',
    marketing: 'Marketing',
  },
  ru: {
    necessary: 'Строго необходимые',
    functional: 'Функциональные',
    analytics: 'Аналитические',
    marketing: 'Маркетинговые',
  },
}

function gpcNotice(
  locale: SupportedLocale,
  deniedCategories: Category[],
  locked: boolean,
): string {
  const labels = deniedCategories
    .map((category) => CATEGORY_LABELS[locale][category])
    .join(', ')
  if (locale === 'ru') {
    return locked
      ? `<p><strong>Global Privacy Control:</strong> ваш браузер отправляет сигнал приватности, поэтому следующие категории отключены и не могут быть включены, пока сигнал активен: ${labels}.</p>`
      : `<p><strong>Global Privacy Control:</strong> ваш браузер отправляет сигнал приватности, поэтому следующие категории отключены: ${labels}. Принятие всех cookie их не включает; при желании вы можете включить их по отдельности ниже.</p>`
  }
  return locked
    ? `<p><strong>Global Privacy Control:</strong> your browser is sending a privacy signal, so the following categories are turned off and cannot be switched on while the signal is active: ${labels}.</p>`
    : `<p><strong>Global Privacy Control:</strong> your browser is sending a privacy signal, so the following categories are turned off: ${labels}. Accepting all cookies does not switch them on; you can enable them individually below if you wish.</p>`
}

function englishBase(config: PrivacyConsentConfig): CC.Translation {
  const { siteName, links } = config
  const footer = [
    link(links.privacyPolicy, 'Privacy Policy'),
    link(links.cookiePolicy, 'Cookie Policy'),
    links.terms ? link(links.terms, 'Terms') : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return {
    consentModal: {
      title: 'We value your privacy',
      description: `${siteName} uses cookies to run essential features and, with your permission, to measure traffic and personalize content. You can accept all, reject non-essential cookies, or manage your preferences.`,
      acceptAllBtn: 'Accept all',
      acceptNecessaryBtn: 'Reject all',
      showPreferencesBtn: 'Manage preferences',
      closeIconLabel: 'Reject all and close',
      revisionMessage:
        '<br><br>Our privacy terms have changed since your last visit. Please review your choices again.',
      footer,
    },
    preferencesModal: {
      title: 'Cookie preferences',
      acceptAllBtn: 'Accept all',
      acceptNecessaryBtn: 'Reject all',
      savePreferencesBtn: 'Save preferences',
      closeIconLabel: 'Close',
      serviceCounterLabel: 'Service|Services',
      sections: [
        {
          title: 'How we use cookies',
          description: `Manage how ${siteName} uses cookies below. Strictly necessary cookies are always on; everything else is off until you allow it.`,
        },
        {
          title: `${CATEGORY_LABELS.en.necessary} cookies`,
          description:
            'Required for the site to function (security, network, basic preferences). They cannot be switched off.',
          linkedCategory: 'necessary',
        },
        {
          title: `${CATEGORY_LABELS.en.functional} cookies`,
          description:
            'Enable enhanced functionality and personalization such as remembered settings and embedded media.',
          linkedCategory: 'functional',
        },
        {
          title: `${CATEGORY_LABELS.en.analytics} cookies`,
          description:
            'Help us measure traffic and understand how visitors use the site so we can improve it. Analytics services may set cookies and process usage data such as pages viewed, visit duration and device information.',
          linkedCategory: 'analytics',
        },
        {
          title: `${CATEGORY_LABELS.en.marketing} cookies`,
          description:
            'Used to deliver relevant advertising and measure the performance of our campaigns.',
          linkedCategory: 'marketing',
        },
        {
          title: 'More information',
          description: `For any questions about our cookie policy see ${footer}.`,
        },
      ],
    },
  }
}

function russianBase(config: PrivacyConsentConfig): CC.Translation {
  const { siteName, links } = config
  const footer = [
    link(links.privacyPolicy, 'Политика конфиденциальности'),
    link(links.cookiePolicy, 'Политика cookie'),
    links.terms ? link(links.terms, 'Условия использования') : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return {
    consentModal: {
      title: 'Мы ценим вашу приватность',
      description: `${siteName} использует cookie для работы основных функций и, с вашего согласия, для анализа трафика и персонализации контента. Вы можете принять все, отклонить необязательные cookie или настроить параметры.`,
      acceptAllBtn: 'Принять все',
      acceptNecessaryBtn: 'Отклонить все',
      showPreferencesBtn: 'Настроить',
      closeIconLabel: 'Отклонить все и закрыть',
      revisionMessage:
        '<br><br>Условия обработки данных изменились с вашего прошлого визита. Пожалуйста, подтвердите выбор снова.',
      footer,
    },
    preferencesModal: {
      title: 'Настройки cookie',
      acceptAllBtn: 'Принять все',
      acceptNecessaryBtn: 'Отклонить все',
      savePreferencesBtn: 'Сохранить настройки',
      closeIconLabel: 'Закрыть',
      serviceCounterLabel: 'Сервис|Сервиса|Сервисов',
      sections: [
        {
          title: 'Как мы используем cookie',
          description: `Управляйте использованием cookie на сайте ${siteName}. Строго необходимые cookie включены всегда; остальные отключены, пока вы не дадите согласие.`,
        },
        {
          title: `${CATEGORY_LABELS.ru.necessary} cookie`,
          description:
            'Нужны для работы сайта (безопасность, сеть, базовые настройки). Их нельзя отключить.',
          linkedCategory: 'necessary',
        },
        {
          title: `${CATEGORY_LABELS.ru.functional} cookie`,
          description:
            'Включают расширенные возможности и персонализацию: сохранённые настройки, встроенные медиа.',
          linkedCategory: 'functional',
        },
        {
          title: `${CATEGORY_LABELS.ru.analytics} cookie`,
          description:
            'Помогают измерять посещаемость и понимать, как посетители используют сайт, чтобы улучшать его. Сервисы аналитики могут устанавливать cookie и обрабатывать данные об использовании сайта, например о просмотренных страницах, длительности визита и устройстве.',
          linkedCategory: 'analytics',
        },
        {
          title: `${CATEGORY_LABELS.ru.marketing} cookie`,
          description:
            'Используются для показа релевантной рекламы и оценки эффективности кампаний.',
          linkedCategory: 'marketing',
        },
        {
          title: 'Дополнительная информация',
          description: `По вопросам об использовании cookie смотрите ${footer}.`,
        },
      ],
    },
  }
}

/**
 * Build the en/ru translation set from config, appending the GPC notice when
 * active and applying any consumer overrides on top.
 */
export function buildTranslations(
  config: PrivacyConsentConfig,
  options: BuildOptions,
): Record<SupportedLocale, CC.Translation> {
  const bases: Record<SupportedLocale, CC.Translation> = {
    en: englishBase(config),
    ru: russianBase(config),
  }

  const locales: SupportedLocale[] = ['en', 'ru']
  const result = {} as Record<SupportedLocale, CC.Translation>

  for (const locale of locales) {
    let translation = bases[locale]

    if (options.gpcActive && options.showGpcNotice) {
      const notice = gpcNotice(
        locale,
        options.gpcDeniedCategories,
        options.gpcLocked,
      )
      const intro = translation.preferencesModal.sections[0]
      if (intro) {
        intro.description = `${notice}${intro.description ?? ''}`
      }
    }

    const override = config.translations?.[locale]
    if (override) translation = deepMerge(translation, override)

    result[locale] = translation
  }

  return result
}
