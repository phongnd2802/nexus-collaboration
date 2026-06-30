from arq.cli import cli


def main() -> None:
    cli.main(args=["nexus_ai_service.workers.rag_jobs.WorkerSettings"], standalone_mode=False)


if __name__ == "__main__":
    main()

