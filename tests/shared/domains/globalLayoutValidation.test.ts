/**
 * @fileoverview Unit tests for global layout validation.
 *
 * Module under test: shared/domains/GlobalLayoutDomain.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:global-layout`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GlobalLayoutDomain } from "@shared/domains/GlobalLayoutDomain";
import { DEFAULT_GLOBAL_LAYOUT, type HeaderConfig, type FooterConfig } from "@shared/constants/globalLayout";

describe("GlobalLayoutDomain.validateHeader", () => {
  it("passes validation for default header configuration", () => {
    assert.doesNotThrow(() => {
      GlobalLayoutDomain.validateHeader(DEFAULT_GLOBAL_LAYOUT.header);
    });
  });

  it("throws error for missing or invalid header object", () => {
    assert.throws(() => {
      GlobalLayoutDomain.validateHeader(null as any);
    }, /Header configuration must be an object/);
  });

  it("throws error for invalid gap layout value", () => {
    const invalidHeader: HeaderConfig = {
      layout: { gap: "huge" as any, align: "start" },
      categories: [],
      userMenu: [],
    };
    assert.throws(() => {
      GlobalLayoutDomain.validateHeader(invalidHeader);
    }, /Header layout gap must be 'sm', 'md', 'lg', 'xl', or '2xl'/);
  });

  it("throws error for invalid align layout value", () => {
    const invalidHeader: HeaderConfig = {
      layout: { gap: "md", align: "right" as any },
      categories: [],
      userMenu: [],
    };
    assert.throws(() => {
      GlobalLayoutDomain.validateHeader(invalidHeader);
    }, /Header layout align must be 'start', 'center', or 'end'/);
  });

  it("throws error for invalid category align value", () => {
    const invalidHeader: HeaderConfig = {
      layout: { gap: "md", align: "start" },
      categories: [
        {
          id: "main",
          label: "Main",
          align: "right" as any,
          items: [],
        },
      ],
      userMenu: [],
    };
    assert.throws(() => {
      GlobalLayoutDomain.validateHeader(invalidHeader);
    }, /Header category 'main' align must be 'start', 'center', or 'end'/);
  });

  it("throws error for missing category id", () => {
    const invalidHeader: HeaderConfig = {
      layout: { gap: "md", align: "start" },
      categories: [
        {
          id: "",
          label: "Main",
          items: [],
        },
      ],
      userMenu: [],
    };
    assert.throws(() => {
      GlobalLayoutDomain.validateHeader(invalidHeader);
    }, /Header category must have a non-empty string ID/);
  });

  it("throws error for invalid nav item icon", () => {
    const invalidHeader: HeaderConfig = {
      layout: { gap: "md", align: "start" },
      categories: [
        {
          id: "main",
          label: "Main",
          items: [
            {
              id: "home",
              href: "/",
              label: "Home",
              icon: "InvalidIconName" as any,
            },
          ],
        },
      ],
      userMenu: [],
    };
    assert.throws(() => {
      GlobalLayoutDomain.validateHeader(invalidHeader);
    }, /Navigation item 'home' has an invalid or unsupported icon: 'InvalidIconName'/);
  });

  it("throws error for invalid nav item variant", () => {
    const invalidHeader: HeaderConfig = {
      layout: { gap: "md", align: "start" },
      categories: [
        {
          id: "main",
          label: "Main",
          items: [
            {
              id: "home",
              href: "/",
              label: "Home",
              variant: "invalid-variant" as any,
            },
          ],
        },
      ],
      userMenu: [],
    };
    assert.throws(() => {
      GlobalLayoutDomain.validateHeader(invalidHeader);
    }, /Navigation item 'home' variant must be 'link' or 'button'/);
  });

  it("throws error when user menu is not an array", () => {
    const invalidHeader = {
      layout: { gap: "md", align: "start" },
      categories: [],
      userMenu: null,
    } as HeaderConfig;
    assert.throws(() => {
      GlobalLayoutDomain.validateHeader(invalidHeader);
    }, /Header user menu must be an array/);
  });

  it("throws error for invalid user menu item icon", () => {
    const invalidHeader: HeaderConfig = {
      layout: { gap: "md", align: "start" },
      categories: [],
      userMenu: [
        {
          id: "profile",
          href: "/profile",
          label: "Profile",
          icon: "BadIcon" as any,
        },
      ],
    };
    assert.throws(() => {
      GlobalLayoutDomain.validateHeader(invalidHeader);
    }, /Navigation item 'profile' has an invalid or unsupported icon: 'BadIcon'/);
  });
});

describe("GlobalLayoutDomain.validateFooter", () => {
  it("passes validation for default footer configuration", () => {
    assert.doesNotThrow(() => {
      GlobalLayoutDomain.validateFooter(DEFAULT_GLOBAL_LAYOUT.footer);
    });
  });

  it("throws error for missing or invalid footer object", () => {
    assert.throws(() => {
      GlobalLayoutDomain.validateFooter(null as any);
    }, /Footer configuration must be an object/);
  });

  it("throws error for invalid footer layout columns", () => {
    const invalidFooter: FooterConfig = {
      ...DEFAULT_GLOBAL_LAYOUT.footer,
      layout: { columns: 5 as any },
    };
    assert.throws(() => {
      GlobalLayoutDomain.validateFooter(invalidFooter);
    }, /Footer layout columns must be 2, 3, or 4/);
  });

  it("throws error for missing section id", () => {
    const invalidFooter: FooterConfig = {
      sections: [
        {
          id: "",
          title: "Resources",
          links: [],
        },
      ],
      socialLinks: [],
    };
    assert.throws(() => {
      GlobalLayoutDomain.validateFooter(invalidFooter);
    }, /Footer section must have a non-empty string ID/);
  });

  it("throws error for missing link href", () => {
    const invalidFooter: FooterConfig = {
      sections: [
        {
          id: "resources",
          title: "Resources",
          links: [
            {
              id: "link-1",
              href: "",
              label: "Link 1",
            },
          ],
        },
      ],
      socialLinks: [],
    };
    assert.throws(() => {
      GlobalLayoutDomain.validateFooter(invalidFooter);
    }, /Footer link 'link-1' in section 'resources' must have a non-empty string href/);
  });

  it("throws error for invalid social link icon", () => {
    const invalidFooter: FooterConfig = {
      sections: [],
      socialLinks: [
        {
          id: "social-1",
          href: "https://t.me/bot",
          label: "Telegram",
          icon: "BadIcon" as any,
        },
      ],
    };
    assert.throws(() => {
      GlobalLayoutDomain.validateFooter(invalidFooter);
    }, /Footer social link 'social-1' has an invalid or unsupported icon: 'BadIcon'/);
  });
});
